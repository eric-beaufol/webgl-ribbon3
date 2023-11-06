import './style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'
import Stats from 'stats.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass'
import AudioAnalyser from './AudioAnalyzer'

/**
 * Base
 */

// Debug
const params = {
  // Ribbon
  roughness: 0.57,
  metalness: .1,
  ribbonHeight: 20,
  ribbonMaxWidth: .5,
  anchorPointZ: -15,
  ribbonRadius: .1,
  ribbonSegments: 160,
  friction: 0.1,
  ribbonsCount: 10,
  followMouse: true,
  autoMove: false,
  moveInterval: 2,
  spread: 1,
  // Unreal bloom
  active: true,
  threshold: 0,
  strength: 0.2,
  radius: 0,
  exposure: 1,
  // general
  helpers: false,
  // sound
  channel: 0,
  amplitude: 6
}

// Constants
const MOUSE_TARGET = new THREE.Vector3()
const MOUSE = new THREE.Vector3()
let mousePositions = getMousePositions()
const ribbons = []

// Stats
const stats = new Stats()
document.body.appendChild(stats.dom)

// canvas
const canvas = document.querySelector('canvas.webgl')

// Scenes
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

/**
 * Render target
 */

window.THREE = THREE


/**
 * Camera
 */
// Base camera
const { width, height } = sizes
const camera = new THREE.PerspectiveCamera(75, width / height, .1, 100)
camera.position.set(-1, -0.5, 2.5)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.autoRotateSpeed = 0.5
// controls.autoRotate = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
// renderer.setClearColor(0xffffff, 1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.shadowMap.type = THREE.VSMShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

function onResize() {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  composer.setSize(sizes.width, sizes.height)
}

function getMousePositions() {
  return new Array(params.ribbonSegments).fill(new THREE.Vector3())
}

window.addEventListener('resize', onResize)

/**
 * Animate
 */
const clock = new THREE.Clock()

const lights = []
const addLights = () => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)

  const lightShadowMapSize = 3
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(1, 2, 4)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 150
  directionalLight.shadow.camera.top = lightShadowMapSize
  directionalLight.shadow.camera.bottom = -lightShadowMapSize
  directionalLight.shadow.camera.left = -lightShadowMapSize
  directionalLight.shadow.camera.right = lightShadowMapSize
  directionalLight.shadow.bias = -0.001;

  scene.add(directionalLight)

  const directionalLight1 = directionalLight.clone()
  directionalLight1.intensity = 0.2
  directionalLight1.position.x = -2
  scene.add(directionalLight1)

  const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 1, 0x00ff00)
  // scene.add(lightHelper)

  const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
  // scene.add(shadowHelper)

  lights.push(directionalLight, directionalLight1)
}

let vHelper1, vHelper2
const addHelpers = () => {
  if (!vHelper1) {
    vHelper1 = new THREE.GridHelper(30, 30, 0xff0000)
    vHelper1.rotation.x = Math.PI / 2
    scene.add(vHelper1)
  }

  vHelper1.position.z = params.anchorPointZ

  if (!vHelper2) {
    vHelper2 = new THREE.GridHelper(10, 10, 0x00ff00)
    vHelper2.rotation.x = Math.PI / 2
    vHelper2.position.z = 0
    vHelper2.color = 0x00ffff
    scene.add(vHelper2)
  }

  addBox()

  vHelper1.visible = vHelper2.visible = box.visible = params.helpers
}

let baseGeometry

const addRibbons = () => {
  const { ribbonHeight, ribbonRadius } = params
  const ribbonZ = -ribbonHeight / 2 - params.anchorPointZ

  for (let i = 0; i < params.ribbonsCount; i++) {
    const randRadius = ribbonRadius * (Math.random() * 0.9 + 0.1)

    const baseGeometry = new THREE.CylinderGeometry(
      randRadius * 0.01, 
      randRadius, 
      ribbonHeight, 
      7, 
      params.ribbonSegments - 1,
      true
    )
    baseGeometry.translate(0, ribbonZ, 0)

    const color = new THREE.Color().setHSL(Math.random(), 1, .5)

    const mesh = new THREE.Mesh(
      baseGeometry.clone(),
      new THREE.MeshBasicMaterial({ 
        color,
        side: THREE.DoubleSide 
      })
    )
    
    // mesh.geometry.translate(0, ribbonZ, 0)
    mesh.rotation.x = -Math.PI / 2
    mesh.userData.id = i
    mesh.userData.offset = new THREE.Vector2(
      THREE.MathUtils.randFloatSpread(.5 + 1),
      THREE.MathUtils.randFloatSpread(.5 + 1)
    )
    mesh.userData.baseGeometry = baseGeometry

    ribbons.push(mesh)
  }

  scene.add(...ribbons)
}

const removeRibbons = () => {
  scene.remove(...ribbons)
  ribbons.length = 0
}

const updateRibbons = () => {
  ribbons.forEach((ribbon) => {
    const position = ribbon.geometry.attributes.position.array
    const basePosition = ribbon.userData.baseGeometry.attributes.position.array

    for (let i = 0; i < position.length; i += 3) {
      const index = (params.ribbonSegments - 1) - Math.floor(i / 3 / 8)
      const { offset } = ribbon.userData

      // For plane geometry
      if (mousePositions[index]) {
        const ratio = i / position.length * params.spread

        position[i + 0] = basePosition[i + 0] + mousePositions[index].x +  offset.x * ratio // x
        position[i + 2] = basePosition[i + 2] + mousePositions[index].y + offset.y * ratio // y
      }
    }

    ribbon.geometry.attributes.position.needsUpdate = true
  })
}

let box
const addBox = () => {
  if (!box) {
    box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, .2),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
    )
    scene.add(box)
  }

  box.position.z = params.anchorPointZ
}

const onMouseMove = e => {
  if (!params.followMouse) {
    return
  }

  const vec = new THREE.Vector3() // create once and reuse
  const pos = new THREE.Vector3() // create once and reuse

  vec.set(
    (e.clientX / window.innerWidth) * 2 - 1,
    - (e.clientY / window.innerHeight) * 2 + 1,
    0.5
  )

  vec.unproject(camera)
  vec.sub(camera.position).normalize()
  pos.copy(camera.position).add(vec)

  // Method #1 (failed)
  const offsetCamToVec = pos.clone().sub(camera.position)
  const offsetAnchorPointZ = params.anchorPointZ - camera.position.z
  const ratio = offsetAnchorPointZ / offsetCamToVec.z
  const offsetX = offsetCamToVec.x * ratio
  const offsetY = offsetCamToVec.y * ratio
  const x = camera.position.x + offsetX
  const y = camera.position.y + offsetY
  const position = new THREE.Vector3(x, y, params.anchorPointZ)

  pos.copy(position)
  MOUSE_TARGET.copy(new THREE.Vector2(pos.x, pos.y))

  if (box) {
    box.position.copy(pos)
  }
}

const addEvents = () => {
  window.addEventListener('mousemove', onMouseMove)
}

const updateMousePoints = () => {
  MOUSE.add(MOUSE_TARGET.clone().sub(MOUSE).multiplyScalar(params.friction))

  mousePositions.push(MOUSE.clone())

  if (mousePositions.length > params.ribbonSegments) {
    mousePositions.shift()
  }   
}

let composer, bloomPass, smaaPass
const addBloom = () => {
  // postprocessing
  const { strength, radius, threshold } = params
  const renderScene = new RenderPass(scene, camera)
  bloomPass = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), strength, radius, threshold)
  smaaPass = new SMAAPass(sizes.width, sizes.height)
  const outputPass = new OutputPass()
  composer = new EffectComposer(renderer)
  composer.addPass(renderScene)
  composer.addPass(bloomPass)
  composer.addPass(smaaPass)
  composer.addPass(outputPass)
}

let audioAnalyser
const addAudio = () => {
  audioAnalyser = new AudioAnalyser(32)
  audioAnalyser.setSource('/mp3/fern-kinney-im-ready-for-your-love-ramsey-hercules-edit-for-kirsty-p.mp3')
}

let gui
const addGUI = () => {
  gui = new dat.GUI()

  const ribbonFolder = gui.addFolder('ribbon')

  ribbonFolder.add(params, 'roughness', 0, 1, .001)
  ribbonFolder.add(params, 'metalness', 0, 1, .001)
  ribbonFolder.add(controls, 'autoRotate')
  ribbonFolder.add(params, 'ribbonHeight', 7, 60).onChange(() => {
    removeRibbons()
    addRibbons()
  })
  ribbonFolder.add(params, 'anchorPointZ', -40, -5).onChange(() => {
    removeRibbons()
    addRibbons()
    addHelpers()
    box.position.z = params.anchorPointZ
  })
  ribbonFolder.add(params, 'ribbonRadius', .03, 1).onChange(() => {
    removeRibbons()
    addRibbons()
  })
  ribbonFolder.add(params, 'ribbonSegments', 10, 200, 1).onChange(() => {
    mousePositions = getMousePositions()
    removeRibbons()
    addRibbons()
  })
  ribbonFolder.add(params, 'friction', 0.01, 1, .001)
  ribbonFolder.add(params, 'ribbonsCount', 1, 30, 1).name('count').onChange(() => {
    removeRibbons()
    addRibbons()
  })
  ribbonFolder.add(params, 'spread', 0.1, 10)
  ribbonFolder.add(params, 'followMouse').listen().onChange(() => {
    MOUSE_TARGET.set(0, 0)
    box.position.set(0, 0)
    params.autoMove = false
  })

  ribbonFolder.add(params, 'autoMove').listen().onChange(() => {
    if (params.autoMove) {
      params.followMouse = false
    }
  })

  ribbonFolder.add(params, 'moveInterval', .1, 5)

  const bloomFolder = gui.addFolder('bloom')

  if (bloomPass) {
    bloomFolder.add(bloomPass, 'strength', 0, 3)
    bloomFolder.add(bloomPass, 'radius', 0, 1, 0.01)
    bloomFolder.add(bloomPass, 'threshold', 0, 1)
  }

  bloomFolder.add(params, 'active')

  const generalFolder = gui.addFolder('general')

  generalFolder.add(params, 'helpers').onChange(() => {
    vHelper1.visible = vHelper2.visible = box.visible = params.helpers
  })

  params.reset = () => {
    removeRibbons()
    addRibbons()
  }
  generalFolder.add(params, 'reset')

  // const soundFolder = gui.addFolder('sound')
  // soundFolder.add(params, 'channel', 0, 15, 1)
  // soundFolder.add(params, 'amplitude', 1, 10)
  
  // params.play = () => {
  //   audioAnalyser.play()
  // }
  // params.stop = () => {
  //   audioAnalyser.stop()
  // }
  // soundFolder.add(params, 'play')
  // soundFolder.add(params, 'stop')
}

let moveTimestamp = 0

const tick = () => {
  stats.begin()

  const delta = clock.getDelta()
  const elapsedTime = clock.getElapsedTime()

  // audio
  // audioAnalyser.update()
  
  controls.update(elapsedTime)
  updateMousePoints()
  updateRibbons()

  if (params.active) {
    composer.render(delta)
  } else {
    renderer.render(scene, camera)
  }

  if (params.autoMove) {
    moveTimestamp += delta

    if (moveTimestamp > params.moveInterval) {
      // const normalizedBass = audioAnalyser.fbcArray[params.channel] / 255 * 2 - 1

      // const pos = new THREE.Vector3(
      //   0,
      //   normalizedBass * params.amplitude,
      //   params.anchorPointZ
      // )

      const pos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(5),
        THREE.MathUtils.randFloatSpread(5),
        params.anchorPointZ
      )

      MOUSE_TARGET.copy(new THREE.Vector2(pos.x, pos.y))

      if (box) {
        box.position.copy(pos)
      }

      moveTimestamp = 0
    }
  }

  stats.end()

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

addEvents()
addRibbons()
addLights()
addHelpers()
addBloom()
// addAudio()
addGUI()
tick()
