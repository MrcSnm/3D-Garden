import { AnimationMixer, Camera, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, Vector2, Vector3 } from "three";
import { Garden } from "./Garden";
import { PlayerData } from "./PlayerData";
import { gRaycaster, isItemAnimal, isItemCrop } from "./globals";
import { LivingUnit } from "./LivingUnit";
import { AssetManager } from "./AssetManager";
import gsap from "gsap";
import { MouseEvents } from "./basic-input";
import { UI } from "./UI";
import { EffectPlayer } from "./EffectPlayer";
import { tweenWithOnProgress } from "./utils";
import { GameEventEmitter, GameEvents } from "./GameEventEmitter";

const playerAssets = {
    images: {
        smoke: "assets/images/smoke.png"
    }
}

const validPosColor = 0xffffff;
const invalidPosColor = 0xff0000;
const validForOtherTypeColor = 0xff8800;

/**
 * This class is responsible for making the map cursor in the Garden
 * And sending commands for the garden to spawn a unit. So, it has a slave/master
 * relationship with the Garden.
 */
export class PlayerController extends Group
{
    /**
     *
     * @param {UI} ui
     * @param {Garden} garden
     * @param {EffectPlayer} effects
     * @param {GameEventEmitter} events
     * @param {Camera} camera
     * @param {Scene} scene
     */
    constructor(ui, garden, effects, events, camera, scene)
    {
        super();
        this.ui = ui;
        this.garden = garden;
        this.camera = camera;
        this.events = events;
        this.effects = effects;
        this.pointer = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI/2), new MeshBasicMaterial());
        this.clickPos = new Vector3();
        this.scene = scene;
        this.add(this.pointer);
        scene.add(this);

        MouseEvents.get().addHandler(this);
    }

    static async loadAssets()
    {
        return Promise.all([
            AssetManager.loadTexture(playerAssets.images.smoke)
        ]);
    }

    /**
     * Used only as a way to identify in the screen if that area could be populated with other kind of item
     * @returns {boolean}
     */
    isAnyUnitSpawnableInMousePosition()
    {
        const permission = this.garden.getPermissionAtPos(this.pointer.position);
        return permission.animals || permission.croppable;
    }

    /**
     * Used for identifying if the player has permission to spawn at the current mouse position
     * @returns {boolean}
     */
    isUnitSpawnableInMousePosition()
    {
        const permission = this.garden.getPermissionAtPos(this.pointer.position);
        if(!permission)
            throw new Error(`Unexpected missing permission.`);
        return permission.unit == null && ((isItemAnimal(PlayerData.selected) && permission.animals) || (isItemCrop(PlayerData.selected) && permission.croppable));
    }

    onMouseUp(mouse)
    {
        this.events.emitEvent(GameEvents.click, this.clickPos);
        if(this.isUnitSpawnableInMousePosition())
        {
            const mesh = this.effects.spawnMesh(this.clickPos, AssetManager.getTexture(playerAssets.images.smoke), 3, 3);
            this.garden.createUnit(PlayerData.selected, this.clickPos);
            mesh.scale.set(0,0,0);

            const startY = this.clickPos.y;
            tweenWithOnProgress(0.1, (p) =>
            {
                mesh.material.opacity = p;
                mesh.scale.set(p,p,p);
                mesh.position.y = p * 4 + startY;
            }, 'none', () =>
            {
                tweenWithOnProgress(0.1, (p) =>
                {
                    let ip = 1-p;
                    mesh.material.opacity = ip;
                    mesh.scale.set(ip, ip, ip);
                }, 'none', () => this.effects.kill(mesh));
            });
        }
    }

    /**
     * Updates the visual representation of the cursor in the garden's ground. It doesn't do anything beyond that and it is not even used
     * for the actual unit creation.
     */
    update()
    {
        this.garden.getClickPosition(this.camera, this.clickPos);
        this.clickPos.set(Math.floor(this.clickPos.x) + 0.5, this.clickPos.y+0.4, Math.floor(this.clickPos.z) + 0.5);
        this.pointer.position.copy(this.clickPos);
        if(!this.isUnitSpawnableInMousePosition())
        {
            this.pointer.material.color.setHex(this.isAnyUnitSpawnableInMousePosition() ? validForOtherTypeColor :invalidPosColor);
            // console.log(this.garden.getPermissionAtPos(this.camera));
        }
        else
            this.pointer.material.color.setHex(validPosColor);

    }

}