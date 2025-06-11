import { Object3D } from "three";

export class MeshPool
{
    /**@type {Map<Object3D, {alive: Array<Object3D>, dead: Array<Object3D>}} */
    meshes = null;
    constructor()
    {
        this.meshes = new Map();
    }
    /**
     * @param {Object3D} meshType
     * @returns {Object3D}
     */
    getMesh(meshType)
    {
        if(!this.meshes.has(meshType))
            this.meshes.set(meshType, {alive: [], dead: []});
        const pool = this.meshes.get(meshType);
        let ret;
        if(pool.dead.length)
        {
            const deadMesh = pool.dead.splice(0, 1)[0];
            deadMesh.visible = true;
            ret = deadMesh;
        }
        else
        {
            const clone = meshType.clone();
            clone.userData.original = meshType;
            ret = clone;
        }
        pool.alive.push(ret);
        return ret;
    }

    /**
     *
     * @param {Object3D} mesh
     */
    kill(mesh)
    {
        if(!mesh.userData.original)
            throw new Error(`This mesh is not being managed by this pool.`);
        const pool = this.meshes.get(mesh.userData.original);
        if(!pool)
            throw new Error(`This object was never created by this pool.`);
        const index = pool.alive.indexOf(mesh);
        if(index == -1)
            throw new Error(`This object is not alive in pool.`);
        pool.alive.splice(index, 1);
        pool.dead.push(mesh);
        mesh.visible = false;
    }
}