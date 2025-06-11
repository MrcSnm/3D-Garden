import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { AssetManager } from "./AssetManager";
import { isItemAnimal, isItemCrop, ItemType } from "./globals";
import { AnimationMixer, Group, Mesh } from "three";

const model = "assets/gltf/objects.glb";


const Meshes = {
    crops: {
        corn: ["corn", 3],
        grape: ["grape", 3],
        strawberry: ["strawberry", 3],
        tomato: ["tomato", 3]
    },
    animals:
    {
        chicken: ["chicken", 1],
        cow: ["cow", 1],
        sheep: ["sheep", 1],
    }
}

const Animations = {
    [ItemType.sheep]: {
        idle: "action_sheep"
    },
    [ItemType.cow]: {
        idle: "idle_cow"
    }
}


/**
 * Easily extensible living unit that can be added to a Garden.
 * One could even specify the amount of value one unit has, or even use the growthStage as a scale for animals
 * or etc.
 */
export class LivingUnit extends Group
{
    static async loadAssets()
    {
        return AssetManager.loadModel(model);
    }

    growthStage = 1;

    /**
     *
     * @param {Mesh} mesh
     * @param {ItemType[keyof ItemType]} type
     * @param {number} growthStage
     */
    constructor(mesh, type, growthStage = 1)
    {
        super();
        if(!AssetManager.getModel(model))
            throw new Error(`Expected to have called await LivingUnit.loadAssets before instantiating LivingUnit `);
        this.mesh = mesh;
        this.growthStage = growthStage;
        this.type = type;
        if(isItemAnimal(type))
        {
            this.mixer = new AnimationMixer(this.mesh);
            const animations = AssetManager.getModel(model).animations;
            const idle = this.mixer.clipAction(animations.find((v) => v.name == Animations[this.type].idle));
            idle.play();
        }
        this.add(mesh);
    }

    grow()
    {
        if(isItemCrop(this.type) && this.growthStage != 3)
        {
            const oldMesh = this.mesh;
            this.mesh = LivingUnit.getObjBase(this.type, ++this.growthStage);

            this.mesh.position.copy(oldMesh.position);
            this.mesh.scale.copy(oldMesh.scale);
            this.mesh.lookAt(0, 0, oldMesh.rotation.z);

            this.mesh.traverse((obj) =>
            {
                if(obj.isMesh)
                {
                    obj.castShadow = oldMesh.castShadow;
                    obj.receiveShadow = oldMesh.receiveShadow;
                }
            });
            this.remove(oldMesh);
            this.add(this.mesh);
        }
    }

        /**
     * @param {ItemType[keyof ItemType]} cropObj
     * @param {number} growthStage
     */
    static getObjBase(itemType, growthStage = 1)
    {
        const objBase = meshFromItemType(itemType);
        const gltf = AssetManager.getModel(model);
        const obj = gltf.scene.getObjectByName(`${objBase[0]}_${growthStage}`);
        if(!obj)
        {
            throw new Error(`Could not find ${objBase[0]}_${growthStage} inside the model at ${model}`);
        }
        return isItemAnimal(itemType) ? SkeletonUtils.clone(obj) : obj.clone();
    }

    /**
     *
     * @param {*} itemType
     * @param {*} growthStage
     * @returns
     */
    static getUnit(itemType, growthStage = 1)
    {
        return new LivingUnit(this.getObjBase(itemType, growthStage), itemType, growthStage);
    }

    static getAnimationClips()
    {
        return AssetManager.getModel(model).animations;
    }

    /**
     *
     * @param {number} dt Updates the animation.
     */
    update(dt)
    {
        if(this.mixer)
            this.mixer.update(dt);
    }
}

/**
 *
 * @param {ItemType} itemType
 */
function meshFromItemType(itemType)
{
    switch(itemType)
    {
        case ItemType.corn: return Meshes.crops.corn;
        case ItemType.grape: return Meshes.crops.grape;
        case ItemType.strawberry: return Meshes.crops.strawberry;
        case ItemType.tomato: return Meshes.crops.tomato;
        case ItemType.cow: return Meshes.animals.cow;
        case ItemType.sheep: return Meshes.animals.sheep;
        default: throw new Error(`Inexistent item type ${itemType}`);
    }
}