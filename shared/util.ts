import { marshall } from "@aws-sdk/util-dynamodb";
import { Boardgame } from "./types";

export const generateBoardgameItem = (movie: Boardgame) => {
  return {
    PutRequest: {
      Item: marshall(movie),
    },
  };
};

export const generateBatch = (data: Boardgame[]) => {
  return data.map((e) => {
    return generateBoardgameItem(e);
  });
};