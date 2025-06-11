import { AmbientLight, Camera, CameraHelper, CubeTexture, DirectionalLight, PCFSoftShadowMap, Scene, WebGLCubeRenderTarget, WebGLRenderer } from "three";
import { DayTime, PlayerData } from "./PlayerData";
import { tweenWithOnProgress } from "./utils";
import { AssetManager } from "./AssetManager";



const dayTexture = "assets/images/bg/day.png";
const nightTexture = "assets/images/bg/night.png";
const shadowSize = 80;

const LightConfig = {
    [DayTime.day]: {
        ambientColor: 0xccccccc,
        dirColor: 0xffffff,
        ambientIntensity: 1,
        dirIntensity: 2,
        clearColor: 0x87ceeb,
        texture: dayTexture
    },
    [DayTime.night]: {
        ambientColor: 0x404060,
        dirColor: 0x5050aa,
        ambientIntensity: 1,
        dirIntensity: 0.25,
        clearColor: 0x001023,
        texture: nightTexture
    }
}

/**
 * Manages the current time in the world, being either day or night.
 * It also is responsible for managing the lights and shadows
 */
export class TimeManager
{
    /**
     *
     * @param {Scene} scene
     * @param {Camera} camera
     * @param {WebGLRenderer} renderer
     */
    constructor(scene, camera, renderer)
    {
        this.scene = scene;
        this.renderer = renderer;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        this.light = new AmbientLight();
        this.sun = new DirectionalLight();
        this.sun.castShadow = true;
        this.sun.receiveShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);


        this.sun.shadow.camera.left = -shadowSize;
        this.sun.shadow.camera.right = shadowSize;
        this.sun.shadow.camera.top = shadowSize;
        this.sun.shadow.camera.bottom = -shadowSize;

        this.sun.shadow.camera.near = 0.01;
        this.sun.shadow.camera.far = 200;
        this.sun.shadow.bias = -0.0004;
        this.sun.shadow.normalBias= 0.05;
        this.sun.position.set(-40, 60, -10);
        this.scene.add(this.light, this.sun);
        const day = AssetManager.getTexture(dayTexture);
        this.skybox = new WebGLCubeRenderTarget(day.height);
        this.setDayTime(PlayerData.time);
        // scene.add(new CameraHelper(this.sun.shadow.camera));
    }

    static loadAssets()
    {
        return Promise.all([
            AssetManager.loadTexture(dayTexture),
            AssetManager.loadTexture(nightTexture),
        ])
    }

    /**
     * 
     * @param {DayTime[keyof DayTime]} dayTime 
     */
    setDayTime(dayTime)
    {
        PlayerData.time = dayTime;
        const lc = LightConfig[dayTime];
        this.light.color.setHex(lc.ambientColor);
        this.light.intensity = lc.ambientIntensity;

        this.sun.color.setHex(lc.dirColor);
        this.sun.intensity = lc.dirIntensity;

        this.skybox.fromEquirectangularTexture(this.renderer, AssetManager.getTexture(lc.texture));
        this.scene.background = this.skybox.texture;

        this.renderer.setClearColor(lc.clearColor);


        tweenWithOnProgress(1, (p) =>
        {
            const newPos = dayTime == DayTime.day ? 40 : -40;
            this.sun.position.x = ((1-p)*-newPos) + p*newPos;
        });
    }
}