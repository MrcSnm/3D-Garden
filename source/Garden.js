import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { Mouse } from './basic-input';
import { gIntersects, gRaycaster, isItemAnimal, isItemCrop } from './globals';
import { ItemType } from './UI';
import { LivingUnit } from './LivingUnit';
import gsap from 'gsap';
import { randFloat, randFloatSpread } from 'three/src/math/MathUtils.js';
import { AssetManager } from './AssetManager';
import { tweenWithOnProgress } from './utils';
import { PlayerData } from './PlayerData';
import { GameEventEmitter, GameEvents } from './GameEventEmitter';
import { Group } from 'three/examples/jsm/libs/tween.module.js';


const tileSize = 1;

const groundAsset = `assets/gltf/ground.glb`;

/**
 * @typedef {{croppable: boolean, animals: boolean, unit: LivingUnit }} TileConfig
 */

/** @type {TileConfig} */
const defaultTileConfig = Object.freeze({croppable: false, animals: false, unit: null});

export class Garden
{
    width = 0;
    height = 0;

    /**
     * @param {GameEventEmitter} events
     * @param {number} width
     * @param {number} height
     * @param {THREE.Scene} scene
     */
    constructor(events, width, height, scene)
    {
        this.events = events;
        this.width = width;
        this.height = height;
        this.scene = scene;
        this.ground = AssetManager.getModel(groundAsset).scene;
        //Center around itself
        this.ground.position.sub(new THREE.Box3().setFromObject(this.ground).getCenter(new THREE.Vector3()));
        // this.ground.position.y = 0;
        this.ground.traverse((obj) =>
        {
            if(obj.isMesh)
            {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });
        this.scene.add(this.ground);



        ///Linear matrix so it is more performant
        /** @type {TileConfig[]} */
        this.mat = new Array(width*height).fill(defaultTileConfig, 0, width*height);
        this.grid = createGrid(tileSize, width, height);
        this.grid.visible = false;
        this.grid.position.y = -1.8;

        //Crop Area
        this.fillGridArea({croppable: true, animals: false, unit: null}, 0, 0, 11, 20);
        this.fillGridArea({animals: true, croppable: false, unit: null}, 22, 4, 6, 5);
        this.fillGridArea({croppable: true, animals: true, unit: null}, 18, 12, 10, 12);

        this.createDebugGrid();
        this.scene.add(this.grid);


        this.events.addListener(GameEvents.advanceDay, () => this.onDayAdvance());
    }

    onDayAdvance()
    {
        for(const v of this.mat)
            if(v.unit) v.unit.grow();
    }

    getIndex(x, y)
    {
        const i = y*this.width+x;
        if(x < 0 || y < 0)
            throw new Error(`Can't have either X or Y less than 0. x: ${x}, y: ${y}`);
        if(x > this.width || y > this.height)
            throw new Error(`Can't have either X or Y greather than ${this.width}x${this.height}. x: ${x}, y: ${y}`);
        if(i > this.mat.length)
            throw new Error(`Out of bounds: ${this.width}x${this.height}. x: ${x}, y: ${y}`);
        return i;
    }


    /**
     * Fills a rect of the grid area with a copy of the value passed.
     * @param {TileConfig} data Tile configuration to copy
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    fillGridArea(data, x, y, width, height)
    {
        for(let i = 0; i < height; i++)
            for(let j = 0; j < width; j++)
        {
            if(i+ y > this.height || x + j > this.width)
                throw new Error(`Definition bug: x: ${x+j}, y: ${y+i}`)
            this.mat[this.getIndex(j+x, i+y)] = {
                animals: data.animals,
                croppable: data.croppable,
                unit: null
            }
        }
    }

    createDebugGrid()
    {
        const red = new THREE.Color(0xaa0000);
        const blue = new THREE.Color(0x0000aa);
        const yellow = new THREE.Color(0xaaaa00);

        const offsetX = (-this.width * tileSize)/2;
        const offsetZ = (-this.height * tileSize)/2;


        const instanced = new THREE.InstancedMesh(new THREE.PlaneGeometry(tileSize, tileSize), new THREE.MeshBasicMaterial(), this.width*this.height);
        instanced.position.x = offsetX;
        instanced.position.z = offsetZ;
        instanced.geometry.rotateX(-Math.PI/2);
        let id = 0;

        const matrix = new THREE.Matrix4();

        for(let i = 0; i < this.height; i++)
            for(let j = 0; j < this.width; j++)
        {
            const data = this.mat[this.getIndex(j, i)];
            let mat = 0;
            if(data)
            {
                if(data.croppable && data.animals)
                    mat = yellow;
                else if(data.croppable)
                    mat = blue;
                else if(data.animals)
                    mat = red;
                if(mat)
                {
                    let currId = id++;
                    instanced.setMatrixAt(currId, matrix.setPosition(j+tileSize/2, -0.01, i+tileSize/2));
                    instanced.setColorAt(currId, mat);
                }
            }
        }
        instanced.instanceMatrix.needsUpdate = true;
        this.grid.add(instanced);
    }

    /**
     *
     * @param {number} x
     * @param {number} z
     * @returns {TileConfig}
     */
    getPermissionFromPosition(x, z)
    {
        const locX = Math.round(x + this.width/2);
        const locZ = Math.round(z + this.height/2);
        if(locX >= this.width || locZ >= this.height || locZ < 0 || locX < 0)
            return defaultTileConfig;
        const index = this.getIndex(locX, locZ);

        return this.mat[index];
    }


    /**
     * @param {THREE.Camera} camera Camera for converting 3D to 2D
     * @param {THREE.Vector3} pos outPosition for where the mouse is
     * @returns Same as pos
     */
    getClickPosition(camera, pos)
    {
        gRaycaster.setFromCamera(Mouse, camera);
        const intersects = gRaycaster.intersectObject(this.ground, true, gIntersects());
        if(intersects.length)
            pos.copy(intersects[0].point);
        return pos;
    }

    getPermissionAtPos(pos)
    {
        gRaycaster.set(pos, new THREE.Vector3(0, -1, 0));
        const intersects = gRaycaster.intersectObject(this.grid, false, gIntersects());

        if(intersects.length)
            return this.getPermissionFromPosition(intersects[0].point.x, intersects[0].point.z);


        return defaultTileConfig;
    }

    static async loadAssets()
    {
        return AssetManager.loadModel(groundAsset);
    }

    /**
     * @param {ItemType[keyof ItemType]} type
     * @param {THREE.Vector3} pos
     */
    createUnit(type, pos)
    {
        const permission = this.getPermissionFromPosition(pos.x, pos.z);
        if(permission == defaultTileConfig)
            return;
        if(isItemAnimal(type))
            permission.animals = false;
        if(isItemCrop(type))
            permission.croppable = false;

        let unit = LivingUnit.getUnit(type, 1)
        this.events.emitEvent(GameEvents.spawnUnit, PlayerData.selected)
        unit.mesh.position.copy(pos);

        unit.mesh.scale.set(0,0,0);
        unit.mesh.lookAt(0, 0, randFloat(-20, 20));
        unit.traverse((obj) =>
        {
            if(obj.isMesh)
            {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        permission.unit = unit;


        tweenWithOnProgress(0.5, (p) =>
        {
            unit.mesh.scale.set(p,p,p);
        }, "elastic.out");

        this.scene.add(unit);
    }

    /**
     *
     * @param {number} dt Updates every animation inside the living units
     */
    update(dt)
    {
        for(const v of this.mat)
            if(v.unit) v.unit.update(dt);
    }

}

/**
 * Creates a grid for easier debugging
 * @param {number} tileSize The size of a tile
 * @param {number} width How many columns
 * @param {number} height How many rows of tiles
 * @returns {Group}
 */
function createGrid(tileSize, width, height)
{
    const grp = new THREE.Mesh(new THREE.PlaneGeometry(width*tileSize, tileSize*height).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.4, transparent: true}));

    const mat = new THREE.MeshBasicMaterial({color: 0x000000});

    const gridBorder = 0.1 * tileSize;

    const offsetX = (width*tileSize)/2;
    const offsetZ = (height*tileSize)/2;


    const verticalGeo = new THREE.PlaneGeometry(width*tileSize, gridBorder);
    verticalGeo.rotateX(-Math.PI/2);


    for(let i = 0; i < (height+1); i++)
    {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(width*tileSize, gridBorder), mat);
        line.rotation.x = -Math.PI/2;
        line.position.z = i*tileSize - offsetZ
        line.position.y = 0.01;
        grp.add(line);
    }

    for(let i = 0; i < (width+1); i++)
    {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(gridBorder, tileSize*height), mat);
        line.rotation.x = -Math.PI/2;
        line.position.x = i*tileSize - offsetX;
        line.position.y = 0.01;
        grp.add(line);
    }
    return grp;
}