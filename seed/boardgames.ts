import {Boardgame, Publisher} from '../shared/types'

export const boardgames : Boardgame[] = [
    {
      id: 1,
      name: "Monopoly",
      release_year: 1935,
      country_of_origin: "United States",
      description: "A classic board game where players buy, trade, and develop properties to build a real estate empire and drive their opponents into bankruptcy."
    },
    {
      id: 2,
      name: "Scrabble",
      release_year: 1938,
      country_of_origin: "United States",
      description: "A word game in which players score points by forming words from individual lettered tiles on a game board with a 15x15 grid."
    },
    {
      id: 3,
      name: "Clue (Cluedo)",
      release_year: 1949,
      country_of_origin: "United Kingdom",
      description: "A mystery-solving board game where players gather clues to deduce the murderer, weapon, and location in a mansion."
    },
    {
      id: 4,
      name: "Risk",
      release_year: 1957,
      country_of_origin: "France",
      description: "A strategy board game of diplomacy and conquest where players aim to control the world by capturing territories and defeating opponents' armies."
    },
    {
      id: 5,
      name: "The Game of Life",
      release_year: 1960,
      country_of_origin: "United States",
      description: "A family board game simulating a person's journey through life, from college to retirement, with various paths and financial choices along the way."
    }
  ];

export const publishers: Publisher[] = [
    {
      boardgameId: 1,
      pubName: "Parker Brothers",
      country: "United States",
      year_founded: 1883
    },
    {
      boardgameId: 2,
      pubName: "Hasbro",
      country: "United States",
      year_founded: 1923
    },
    {
      boardgameId: 3,
      pubName: "Waddingtons",
      country: "United Kingdom",
      year_founded: 1920
    },
    {
      boardgameId: 4,
      pubName: "Miro Company",
      country: "France",
      year_founded: 1957
    },
    {
      boardgameId: 5,
      pubName: "Milton Bradley",
      country: "United States",
      year_founded: 1860
    }
  ];
  


