## Serverless REST Assignment - Distributed Systems.

__Name:__ Adrian Strymer

__Demo:__ https://youtu.be/LJrHPXCGb_w

### Context.

The Boardgame App stores information about different boardgames as well as their publishers.

The boardgame table has the following attributes:
id (number): The id of the boardgame (Primary Key)
name (string): The name of the boardgame
release_year (number): The year in which the boardgame was released
country_of_origin (string): The country in which the boardgame originated from
description (string): A summary of what the boardgame is about

### App API endpoints.
 
+ POST /boardgames - Adds a new boardgame to the table.
+ GET /boardgames/id - Gets the boardgame with the specified id
+ GET /boardgames/publishers?boardgameId=value&pubName=value - Gets the publishers that match the given boardgameId and name of the publisher
+ PUT /boardgames/id - Updates the boardgame with the specified id
+ GET /boardgames/id/translation?language=value - Gets the translation of the description of the boardgame with the specified id

### Translation persistence (if relevant).

The attribute that is being translated is the description of the boardgame. A translation table was created to store translations that have been done before. The code checks if a requested translation is in the translation table and if it is, it is taken from the table. If it is not in the table, Amazon Translate is called to translate the given boardgame and the translation is then stored in the table for future use.


