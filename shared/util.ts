import { marshall } from "@aws-sdk/util-dynamodb";
import { Boardgame, Publisher } from "./types";

type Entity = Boardgame | Publisher;  
export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
 },
 };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
 });
};