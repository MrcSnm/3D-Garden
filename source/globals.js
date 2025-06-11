import { Raycaster } from "three";
import { isAnyOf } from "./utils";

///Global raycaster that can be shared between multiple frames thus reducing allocation impact
export const gRaycaster = new Raycaster();
///Used as a sink for the gRaycaster not allocating memory every time
const intersects = [];

/**
 * Used as a sink for the gRaycaster not allocating memory every time. Also sets its length to 0 so it can be reused.
 * Never hold a gIntersects reference as it will keep changing over the time.
 * @returns {import("three").Intersection[]}
 */
export function gIntersects()
{
    intersects.length = 0;
    return intersects;
}


export const GameSize = {
    width: innerWidth,
    height: innerHeight
};


export const ItemType = Object.freeze({
    invalid: -1,
    cow: 0,
    sheep: 1,
    corn: 2,
    grape: 3,
    strawberry: 4,
    tomato: 5,
});


export function isItemAnimal(itemType)
{
    return isAnyOf(itemType, ItemType.cow, ItemType.sheep);
}

export function isItemCrop(itemType)
{
    return !isItemAnimal(itemType) && itemType != ItemType.invalid;
}