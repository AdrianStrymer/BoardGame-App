import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import * as AWS from "aws-sdk";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const translate = new AWS.Translate();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const language = event.queryStringParameters?.language;
    const parameters = event?.pathParameters;
    const boardgameId = parameters?.boardgameId ? parseInt(parameters.boardgameId) : undefined;

    if (!language) {
      return { statusCode: 400, body: "Language query parameter is required" };
    }

    const translationResult = await ddbDocClient.send(new GetCommand({
      TableName: process.env.TRANSLATIONS_TABLE_NAME,
      Key: { boardgameId, languageCode: language },
    }));

    if (translationResult.Item) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          country_of_origin: translationResult.Item.country_of_origin,
          description: translationResult.Item.translatedDescription,
          id: boardgameId,
          name: translationResult.Item.name,
          release_year: translationResult.Item.release_year,
        }),
      };
    }

    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: boardgameId },
    }));

    if (!Item) {
      return { statusCode: 404, body: "Boardgame not found" };
    }

    const translateParams = {
      SourceLanguageCode: "en",
      TargetLanguageCode: language,
      Text: Item.description,
    };

    const translatedMessage = await translate.translateText(translateParams).promise();
    const translatedText = translatedMessage.TranslatedText;

    await ddbDocClient.send(new PutCommand({
      TableName: process.env.TRANSLATIONS_TABLE_NAME,
      Item: {
        boardgameId,
        languageCode: language,
        translatedDescription: translatedText,
        country_of_origin: Item.country_of_origin,
        name: Item.name,
        release_year: Item.release_year,
      },
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        country_of_origin: Item.country_of_origin,
        description: translatedText,
        id: boardgameId,
        name: Item.name,
        release_year: Item.release_year,
      }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};