import './globals';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { UI } from './UI';
import { LivingUnit, Meshes } from './LivingUnit';
import { PlayerController } from './PlayerController';
import { Garden } from './Garden';
import { TimeManager } from './TimeManager';
import { GameEventEmitter } from './GameEventEmitter';
import { EffectPlayer } from './EffectPlayer';
import { SoundPlayer } from './SoundPlayer';
import { GameSize } from './globals';
import { StartTutorial, Tutorial } from './Tutorial';


// init
const events = new GameEventEmitter();
const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera( 45, GameSize.width / GameSize.height, 0.01, 100 );
camera.position.z = 1;
const uiCamera = new THREE.OrthographicCamera(0, GameSize.width, GameSize.height, 0, -100, 100);

const scene = new THREE.Scene();
const scene2D = new THREE.Scene();

const renderer = new THREE.WebGLRenderer( { antialias: true, canvas: document.getElementById("gameCanvas")} );
renderer.autoClear = false;
renderer.setPixelRatio(devicePixelRatio);

document.body.appendChild( renderer.domElement );


camera.position.set(0, 35, 30);
camera.lookAt(0,0,0);
camera.updateMatrixWorld(true);
// const controls = new OrbitControls(camera, renderer.domElement);
async function start()
{
	renderer.setSize( GameSize.width, GameSize.height );
	///For using this style as scalable, I would actually use some kind of ILoad interface so I could optimize
	///Loading time instead.
	await Promise.all([
		Tutorial.loadAssets(),
		UI.loadAssets(),
		TimeManager.loadAssets(),
		Garden.loadAssets(),
		LivingUnit.loadAssets(),
		PlayerController.loadAssets(),
		SoundPlayer.loadAssets()
	]);

	const timeManager = new TimeManager(scene, camera, renderer);
	const soundPlayer = new SoundPlayer(events);
	const ui = new UI(uiCamera, timeManager, events);
	scene2D.add(ui.group);


	const garden = new Garden(events, 28, 24, scene);
	ui.build();
	const tutorial = new Tutorial(ui);
	scene2D.add(tutorial);
	const effects = new EffectPlayer(scene);
	const playerController = new PlayerController(ui, garden, effects, events, camera, scene);
	tutorial.playTutorial(StartTutorial);


	function animate( time ) {

		garden.update(clock.getDelta());
		renderer.clear();
		renderer.render( scene, camera );
		// controls.update();
		renderer.clearDepth();

		playerController.update();
		renderer.render( scene2D, uiCamera );
		ui.animate();

	}
	renderer.setAnimationLoop( animate );
}


start();