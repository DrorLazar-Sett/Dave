// viewer_fbx.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class FBXViewer {
  constructor(container, options = {}) {
    this.container = container;
    this.isDarkMode = document.body.classList.contains('dark-mode');
    this.enableZoom = options.enableZoom !== false; // Default to true unless explicitly disabled
    this.onError = options.onError || null;
    this.isLoading = false;
    this.isDisposed = false;
    this.init();
  }
  async init() {
    this.scene = new THREE.Scene();
    const width = this.container.offsetWidth || this.container.getBoundingClientRect().width;
    const height = this.container.offsetHeight || this.container.getBoundingClientRect().height;
    this.camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.updateBackground();
    this.container.appendChild(this.renderer.domElement);
    this.renderer.setSize(width, height, true);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.5);
    this.scene.add(directionalLight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = this.enableZoom; // Use the enableZoom option
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.animate();
    // Add resize observer
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  onResize() {
    if (this.isDisposed || !this.container || !this.renderer || !this.camera) return;
    
    const containerRect = this.container.getBoundingClientRect();
    const width = this.container.offsetWidth || containerRect.width;
    const height = this.container.offsetHeight || containerRect.height;
    
    if (width > 0 && height > 0) {
      this.renderer.setSize(width, height, true);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  animate() {
    if (this.isDisposed) return;
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    if (this.mixer) { 
      this.mixer.update(this.clock.getDelta()); 
    }
    
    if (this.controls) {
      this.controls.update();
    }
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateBackground() {
    if (this.renderer) {
      const color = this.isDarkMode ? 0x3a3a3a : 0xe8e8e8;
      this.renderer.setClearColor(color);
    }
  }

  setDarkMode(isDark) {
    this.isDarkMode = isDark;
    this.updateBackground();
  }

  loadModel(url) {
    if (this.isDisposed) {
      console.warn('FBXViewer: Cannot load model, viewer is disposed');
      return;
    }
    
    this.isLoading = true;
    const loader = new FBXLoader();
    
    // Set custom texture loader to handle errors
    const textureLoader = new THREE.TextureLoader();
    loader.manager.onError = (url) => {
      console.warn(`Failed to load texture: ${url}`);
      // Don't fail the entire model load for missing textures
    };
    
    loader.load(
      url,
      // Success callback
      (object) => {
        // Check if disposed during loading
        if (this.isDisposed) {
          console.warn('FBXViewer: Model loaded but viewer was disposed');
          return;
        }
        
        try {
          this.isLoading = false;
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.5 / maxDim;
          object.scale.set(scale, scale, scale);
          object.position.sub(center.multiplyScalar(scale));
          this.scene.add(object);
          
          // Handle animations with error handling
          if (object.animations && object.animations.length > 0) {
            try {
              this.mixer = new THREE.AnimationMixer(object);
              // Filter out invalid animations
              const validAnimations = object.animations.filter(clip => {
                return clip && clip.tracks && clip.tracks.length > 0;
              });
              
              if (validAnimations.length > 0) {
                const action = this.mixer.clipAction(validAnimations[0]);
                action.play();
              }
            } catch (animError) {
              console.warn('Error setting up animations:', animError);
              // Continue without animations - don't fail the entire model
              this.mixer = null;
            }
          }
          
          this.controls.reset();
          this.camera.lookAt(0, 0, 0);
        } catch (error) {
          console.error('Error processing FBX model:', error);
          if (this.onError) {
            this.onError(error);
          }
        }
      },
      // Progress callback
      (xhr) => {
        if (xhr.lengthComputable && !this.isDisposed) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          console.log(`Loading FBX: ${percentComplete.toFixed(0)}%`);
        }
      },
      // Error callback
      (error) => {
        if (this.isDisposed) return;
        
        this.isLoading = false;
        console.error('Error loading FBX file:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }

  dispose() {
    // Prevent multiple disposal
    if (this.isDisposed) {
      console.warn('FBXViewer: Already disposed');
      return;
    }
    
    // Mark as disposed first
    this.isDisposed = true;
    
    // Cancel animation frame first
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Cancel ongoing animations
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    // Dispose of Three.js geometries, materials, and textures
    if (this.scene) {
      this.scene.traverse((object) => {
      if (object.isMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            // Dispose all texture types
            const textureProperties = [
              'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap',
              'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap', 'gradientMap',
              'metalnessMap', 'roughnessMap', 'clearcoatMap', 'clearcoatNormalMap',
              'clearcoatRoughnessMap', 'iridescenceMap', 'iridescenceThicknessMap',
              'sheenColorMap', 'sheenRoughnessMap', 'specularIntensityMap',
              'specularColorMap', 'transmissionMap', 'thicknessMap'
            ];
            
            textureProperties.forEach(prop => {
              if (material[prop] && material[prop].dispose) {
                material[prop].dispose();
              }
            });
            
            material.dispose();
          });
        }
      }
      });
      
      // Clear the scene
      while(this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }

    // Dispose controls
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Call this.renderer.dispose() to free WebGL resources
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }


    // Remove the renderer's DOM element from its container
    if (this.container && this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Nullify members
    this.scene = null;
    this.camera = null;
    this.clock = null;

    // Disconnect the ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

export default FBXViewer;
