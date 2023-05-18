# Developer

## Participating

You can post an issue or you can open a PR, if there is a functionality that you think will be relevant to the project.

Your code will be posted using the same license as this project.

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
  - [ ] Allow to provide a dictionary
  - [ ] Allow to provide a dictionary (additionnal)
  - [ ] Allow to provide a forbidden dictionary

- [ ] Commands
  - [x] /connections : list the connections of the peerjs
  - [x] /players : list the players of the game
  - [ ] /echo : do a echo command, other users respond appropriatly
    - [ ] settings to disable the display
  - [ ] /start : start a game
    - [x] Basic setup
    - [ ] System to select only active users
  - [x] /settings
    - [ ] Mutualize the system

- [ ] Game
  - [x] Start a game
    - [x] Start the word guessing game
  - [x] Leave a game
  - [ ] Join a started game

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
  - [ ] Add a player to the room while playing
    - Would be "add name"
    - The command to run would be indicated when connecting to the room
    - Provide an option to do it automatically
    - Provide a way to negociate it (between the two users)

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
  - [ ] Logger
    - [ ] Custom format set by end-user
      - Would need something of the same spirit as log4j
      - Specify coloration in a user-friendly manner
      - Allow to specify which logs display in the terminal, the console

- [ ] Nice to have
  - [ ] Detect if behind symmetric [NAT](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols#nat)
    - It is important because WebRTC without setting up a TURN server will not work in this case
  - [ ] Compare room's users and actual connections

- [ ] Serverless
  - [ ] Command whoami
  - [ ] Room diffusion list

- [ ] Authentication
  - [ ] Identity-less
  - [ ] Identity proof

- [ ] Support NodeJS
  - Should probably be made in another project

- [ ] Database
  - [ ] Support new database version
    - [ ] Install the new one
    - [ ] Remove the former version

### Servers

- [x] PeerJS server
  - [x] Use own server
  - [x] Offer a setting
  - [ ] Let end-user choose it

- [x] [STUN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols#stun) server
  - This server is used to discover your public address, if you are behind a NAT or a firewall
  - [x] Use own server
  - [x] Offer a setting
  - [ ] Let end-user choose it

- [x] [TURN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols#turn) server
  - This server is used in case of symmetric NAT, it relays all the data between peers
  - [x] Use own server
  - [x] Offer a setting
  - [ ] Let end-user choose it

## TODO

- Do a push remote Nginx conf script

- Fix Firefox 
  - WebRTC issues
  - Local storage issues
    - There is no fix there, need to support the fact that it wont be present

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

- Allow to reference the HTTPS remote host as the PeerJS server

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
