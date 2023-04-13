# Developer

## Running tests

> yarn test

## Build

> yarn build

## Features

- [ ] Gameplay
  - [x] Basic features
    - [x] Output a sequence
      - [ ] Display the number of occurences
    - [x] Min occurences
    - [x] Max occurences
    - [ ] Max attempts
  - [x] Timer
    - [x] Timer per guess
  - [x] Consecutive runs
  - [ ] Simultaneus runs
  - [ ] Score
    - [ ] Score per word length
    - [ ] Score per word
    - [ ] Removing score
    - [ ] Health system
    - [ ] Settings
  - [ ] Bonus
    - [ ] Could emit quests

- [ ] Commands
  - [x] /connections : list the connections of the peerjs
  - [x] /players : list the players of the game
  - [ ] /echo : do a echo command, other users respond appropriatly
    - [ ] settings to disable the display
  - [ ] /start : start a game
    - [x] Basic setup
    - [ ] System to select only active users
  - [ ] /settings
    - Some were made
    - But not gonna make one each times a setting is added
    - Should have a generic system
    - Wich respect the types
    - Implem
      - Either we can find a lib
      - If we make one, it is complicated, because of the types
      - Or we auto-detect it : it's either number or string

- [ ] Bot
  - [ ] Mirror bot : could be added to a room, and just ACK the messages send
  - [ ] Answer bot : could be playing with the players

- [ ] Persistance
  - [ ] Persist the username
  - [ ] Persist a room conf
  - [ ] Persist commands
  - [ ] Persist game conf

- [ ] Serving
  - [ ] Github Pages
  - [ ] Others places

- [ ] CI/CD
  - [ ] Use new system to deploy it on a server

- [ ] Publish as library
  - It would be nice to be able to publish the code, for the Vue.JS project
  - But Parcel do not support it very well (at all)
  - Likely that the code will need to be moved to another project

- [ ] Administration
  - [x] Admin
  - [ ] Other kind of management, more cooperatif

- [ ] Room management
  - [ ] WebRTC discovery mode
  - [ ] Should be able to add a player without using the server

- Messaging
  - [x] JSON
  - [ ] Avro
    - Checkout https://www.npmjs.com/package/avsc
    - Should be faster
    - Should probably implemented elsewhere

- [ ] Debug
  - [ ] Could be nice to have the latency between the players
    - Log times etc
    - Maybe checkout time exchange algorithms

- Code quality
  - [ ] Testing
  - [ ] Variables undefined / null
    - Checkout https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
    - If it is not strict : any variable can be null or undefined
    - In this case, there is no need to specify it, except on purpose

- [ ] UI
  - Not important
  - [ ] Score / status displayer
    - There is a third xterm console on top
    - It would require some active page display
    - There is no such framework

## TODO

- Fix Firefox 
  - WebRTC issues
  - Local storage issues

- Fix PeerJS import issues
  - I do not think I've made a lot of modifications in the fork (local project)
    - So maybe it will be fixed in the latest version
  - Otherwise, fork it, modify the exports

- Fix the logs in PeerJS fork
  - I do not remember what I was debugging
  - Might be important

- Fix the hexagonal file structure
  - Was thinking of a api / domain folders, and sub folders per responsibility
    - api might be too vague, that it is very common
  - I do not know how to distinguish primary and secondary ports / adapters

- Fix the command library problem

- Fix the structure of the cmdy commands

- Fix the PeerJS ghost users
  - Refresh the page
  - Some users are listed
  - But they are inactive
  - Checkout if WebRTC connections can be detected in a page
  - Checkout PeerJS
    - Wether or not the event bus can be additional
    - If not, consider a fork, or a plugin to it

- Move the room system to another project
  - Study the possibility to add a plugin system
    - To handle the echo system, remove user system etc

## Info (parcel / typescript import pathing)

https://parceljs.org/features/dependency-resolution/#tilde-specifiers

Absolute does not work in VSCode

~ : not supported either

Using tsc lead to a bug

### Info (PeerJS imports issue)

import Peer from 'peerjs' : does not import the types, it is any, it does recognized the key

Module 'etc/peerjs/index' can only be default-imported using the 'esModuleInterop' flagts(1259)
index.d.ts(5, 1): This module is declared with 'export =', and can only be used with a default import when using the 'esModuleInterop' flag.

import * as PeerJS from 'peerjs' : do not import the constructor, runtime issue

 caught TypeError: _peerjs is not a constructor
