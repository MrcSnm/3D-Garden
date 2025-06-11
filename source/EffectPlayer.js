import { Mesh, PlaneGeometry, Scene, Texture, Vector3 } from "three";
import { getGeometrySize, meshFromSprite } from "./utils";

/**
 * Plays an effect in any kind of the screen.
 * By also saving the alive and dead meshes, it can reuse those
 * meshes and be memory efficient.
 */
export class EffectPlayer
{
    aliveMeshPool = [];
    deadMeshPool = [];
    /**
     *
     * @param {Scene} scene
     */
    constructor(scene)
    {
        this.scene = scene;
    }

    /**
     *
     * @param {Vector3} pos
     * @param {Texture} texture
     * @param {number?} width
     * @param {number?} height
     */
    spawnMesh(pos, texture, width, height)
    {
        /** @type {Mesh} */
        let ret;
        if(this.deadMeshPool.length == 0)
        {
            ret = meshFromSprite(texture, width, height);
            this.scene.add(ret);
        }
        else
            ret = this.deadMeshPool.splice(this.deadMeshPool.length - 1, 1)[0];
        const sz = getGeometrySize(ret.geometry);
        if(width && height)
        {
            if(sz.width != width || sz.height != height)
                ret.geometry = new PlaneGeometry(width, height);
        }
        ret.position.copy(pos);
        ret.visible = true;
        this.aliveMeshPool.push(ret);
        return ret;
    }

    /**
     *
     * @param {Mesh} mesh
     */
    kill(mesh)
    {
        const index = this.aliveMeshPool.indexOf(mesh);
        if(index < 0) throw new Error(`Could not find mesh ${mesh.name} in living meshes.`);
        mesh.visible = false;
        this.aliveMeshPool.splice(index, 1);
        this.deadMeshPool.push(mesh);
    }
}