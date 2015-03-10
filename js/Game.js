var TopDownGame = TopDownGame || {};

//title screen
TopDownGame.Game = function(){};

TopDownGame.Game.prototype = {
    
    init: function(map) {
        if (map === undefined) {
            map = 'level3';
        }
        this.map = this.game.add.tilemap(map);
        this.turnFactor = map == 'level3' ? 1.5 : 1.25;
    },
    
    preload: function() 
    {
        var start_velocity = getParameterByName('start_velocity') || 70,
            start_interval = getParameterByName('start_interval') || 2,
            start_canturn = !!getParameterByName('start_canturn'),
            delta_nextlevel = getParameterByName('delta_nextlevel') || 1000,
            offset = getParameterByName('offset') || 0.25,
            enable_offset = !!getParameterByName('enable_offset');    
           
        this.delta_velocity = getParameterByName('delta_velocity') || 0.2;
        this.pow_velocity = getParameterByName('pow_velocity') || -0.2;
        this.delta_interval = getParameterByName('delta_interval') || 0.05;
        this.pow_interval = getParameterByName('pow_interval') || 2;
        this.toggle_canturn = !!getParameterByName('toggle_canturn');
        
        this.game.time.advancedTiming = true;
        this.settings = {
            nextlevelScore: parseInt(delta_nextlevel),
            velocity: parseInt(start_velocity),
            startVelocity: parseFloat(start_velocity),
            interval: parseFloat(start_interval),
            startInterval: parseFloat(start_interval),
            angular: (Math.PI * this.map.tileWidth * this.turnFactor / (2 * parseInt(start_velocity))) * 1000,
            canTurn: start_canturn,
            offset: parseFloat(offset),
            offsetEnabled: enable_offset
        };
        console.log(this.settings);
        //player initial score of zero
        this.playerScore = 0;
        this.crash = false;
        this.lastStartPositionIndex;
        this.velocityIntervalTrigger = true;
        this.level = 1;
    },  
    
    create: function() 
    {
        //the first parameter is the tileset name as specified in Tiled, the second is the key to the asset
        this.map.addTilesetImage('tmw_desert_spacing', 'gameTiles');

        //create layers
        this.backgroundlayer = this.map.createLayer('bgLayer');
        this.blockedLayer = this.map.createLayer('blockedLayer');

        //collision on blockedLayer
        this.map.setCollision([26,42], true, 'blockedLayer');

        //resizes the game world to match the layer dimensions
        this.backgroundlayer.resizeWorld();

        //this.createCrossings();
        this.createZonesAndLights();

        // Here we create our car
        this.startPositions = this.findObjectsByType('carStart', this.map, 'objectsLayer');
        this.carGroup = this.game.add.group();
        this.bumperGroup = this.game.add.group();
        this.carNumber = 1;
        
        this.showScore();
        this.showLevelInfo();
        
        //sounds
        this.goalSound = this.game.add.audio('goal');
        this.crashSound = this.game.add.audio('crash');
        this.signalSound = this.game.add.audio('light');
        
        // keyboard
        var space = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        space.onDown.add(function() {
            this.game.paused = !this.game.paused;
            console.log(this.game.paused ? 'Game paused' : 'Game resumed');
        }, this);
        var restart = this.game.input.keyboard.addKey(Phaser.Keyboard.ESC);
        restart.onDown.add(function() {
            this.game.state.start('MainMenu');
        }, this);
        
        // set bgsound volume
        //this.game.properties.bgSound.stop();
        // run main loop
        //this.mainLoop = this.game.time.events.loop(Phaser.Timer.SECOND*this.settings.interval, this.respawnCar, this);
        //realInRange(min, max)
        
        this.mainLoop = this.game.time.create(false);
        this.mainLoop.add(Phaser.Timer.SECOND * (this.settings.interval + (this.settings.offsetEnabled ? this.game.rnd.realInRange(-this.settings.offset, this.settings.offset) : 0)), this.respawnCar, this);    
        this.mainLoop.start();
    },
  
    update: function() 
    {
        // unfreeze a car
        this.carGroup.forEach(function(el){
            if(el.isWaiting) {
                el.isWaiting = false;
                el.body.velocity.x = el.velocityX;
                el.body.velocity.y = el.velocityY;
            }
        });
        
        // car crash check (from != from)
        this.game.physics.arcade.collide(this.carGroup, undefined, this.collideCars, this.checkCrash, this);
        // traffic jam check (from == from and isTurning == false)
        this.game.physics.arcade.overlap(this.carGroup, undefined, this.overlapCars, this.checkCarUnder, this);
        // red light check
        this.game.physics.arcade.overlap(this.bumperGroup,this.zoneGroup, this.overlapBumperZone, this.checkZoneByBumper, this);
        // turn check
        this.game.physics.arcade.overlap(this.carGroup,this.zoneGroup, this.overlapCarZone, this.checkZoneByCar, this);
        // distance check (from == from)
        this.game.physics.arcade.overlap(this.bumperGroup,this.carGroup, this.overlapBumperCar, this.checkCarAhead, this);
        
        // stick bumper to a car
        this.bumperGroup.forEach(function(el){
            el.body.velocity.x  = el.car.body.velocity.x;
            el.body.velocity.y  = el.car.body.velocity.y;
        });
    },
  
    render: function()
    {
        var state = this;
        //this.game.debug.text('active cars: '+this.carGroup.total, 20, 20, "#00ff00", "20px Courier"); 
        //this.game.debug.text('fps: '+this.game.time.fps || '--', 20, 20, "#00ff00", "20px Courier");   
        //this.game.debug.body(this.car.bumper);
        //this.game.debug.body(this.crossing);
        /*this.bumperGroup.forEach(function(el){
            state.game.debug.spriteBounds(el);
            state.game.debug.body(el);
            //state.game.debug.body(el.car);
           // state.game.debug.spriteInfo(el,10,10);
        });*/
    },
  
  
    /*createCrossings: function() 
    {
        //create items
        var crossingGroup = this.game.add.group(),
            items = this.findObjectsByType('crossing', this.map, 'objectsLayer'),
            state = this;
    
        items.forEach(function(el,idx,array){
            var crossingSprite = crossingGroup.add(state.game.add.tileSprite(el.x, el.y ,el.width,el.height,'crossing'));
        });
    },*/
    
    createZonesAndLights: function() 
    {
        //create items
        var signals = this.findObjectsByType('signal', this.map, 'objectsLayer'),
            zones =  this.findObjectsByType('zone', this.map, 'objectsLayer'),
            zonesById = {},
            zoneGroup = this.game.add.group(),
            state = this;
           
        this.signalGroupObj = [];   
        zones.forEach(function(el){
            zonesById[el.properties.lzId] = el;
        });
        signals.forEach(function(el){
            if(zonesById[el.properties.lzId] !== undefined && el.properties.lzgId !== undefined) {
                if(this.signalGroupObj[el.properties.lzgId-1] === undefined) {
                    this.signalGroupObj[el.properties.lzgId-1] = this.game.add.group();
                }
                var signalGroup = this.signalGroupObj[el.properties.lzgId-1],
                    signalSprite = state.createFromTiledObject(el, signalGroup),
                    zone = zonesById[el.properties.lzId],
                    zoneSprite = zoneGroup.create(zone.x, zone.y, null);
                  
                signalSprite.scale.set(0.128);
                signalSprite.properties = {
                    state: 'red',
                    lzgId: el.properties.lzgId
                };
                signalSprite.inputEnabled = true;
                //signalSprite.hitArea = new Phaser.Circle(signalSprite.x + signalSprite.width/2,signalSprite.y + signalSprite.height/2,signalSprite.height*2);
                signalSprite.events.onInputDown.add(state.switchTheLight, state);
                state.game.physics.enable(zoneSprite, Phaser.Physics.ARCADE);
                zoneSprite.body.setSize(zone.width, zone.height, 0, 0);
                zoneSprite.body.immovable = true;
                // crosslinks
                signalSprite.zone = zoneSprite;
                zoneSprite.signal = signalSprite;
            }
        },this);
        
        this.zoneGroup = zoneGroup;
        
        // make one randomly green
        this.signalGroupObj.forEach(function(el){
            var first = el.getChildAt(this.game.rnd.integerInRange(0, el.total-1));
            
            first.properties.state = 'green';
            first.frame = 1;
        },this);
    },
  
    switchTheLight: function(sprite,pointer)
    {
        // make this green and the rest - red
        if(sprite.properties.state == 'red') {
            this.signalGroupObj[sprite.properties.lzgId-1].setAll('properties.state','red');
            this.signalGroupObj[sprite.properties.lzgId-1].setAll('frame',0);
            //play audio
            this.signalSound.play();
            sprite.properties.state = 'green';
            sprite.frame = 1;
        }    
    },
    
    respawnCar: function() 
    {
        //console.log('respawn car');
        if(!this.carGroup.countDead()) {
            //console.log('empty group - create car');
            this.createCar();
        }
        else {
            var deadCar = this.carGroup.getFirstDead();
            if (deadCar) {
                //console.log('there is a dead car - apply route');
                deadCar.bringToTop();
                this.changeOrigin(deadCar);
            }
            else {
                console.log(this.carGroup.total," Can't get a deadCar. Something wrong?");
            }
        }
        /*if(!this.carGroup.total) {
            //console.log('empty group - create car');
            this.createCar();
        }*/
        
        // next iteration
        this.mainLoop.add(Phaser.Timer.SECOND * (this.settings.interval + (this.settings.offsetEnabled ? this.game.rnd.realInRange(-this.settings.offset, this.settings.offset) : 0)), this.respawnCar, this);  
    },
    
    createCar: function() 
    {
        //console.log('create a car');
        // car sprite
        var carSprite = this.game.add.sprite(0,0,'car'),
            bumperSprite = this.game.add.sprite(0,0);
        
        // make origin at the center
        carSprite.anchor.setTo(.5,.5);
        carSprite.checkWorldBounds = true;
        carSprite.events.onOutOfBounds.add(this.incrementScore,this);
        /*carSprite.events.onKilled.add(function(car){
            console.log(car.number,car.exists,car.bumper.exists,' killed');
        },this);*/
        carSprite.outOfBoundsKill = true;
        
        // custom property
        carSprite.isMoving = true;
        carSprite.isWaiting = false;
        carSprite.isTurning  = false;
        carSprite.canTurnLeft = false;
        carSprite.number = this.carNumber++;
        
        // invisible bumber
        bumperSprite.anchor.setTo(.5,.5);
        bumperSprite.checkWorldBounds = true;
        bumperSprite.outOfBoundsKill = true;
        /*bumperSprite.events.onOutOfBounds.add(function(bumper){
            console.log(bumper.car.number,bumper.car.exists,bumper.exists,' bumper out of bounds');
        },this);
        bumperSprite.events.onKilled.add(function(bumper){
            console.log(bumper.car.number,bumper.car.exists,bumper.exists,' bumper killed');
        },this);*/
        
        // cross-links
        carSprite.bumper = bumperSprite;
        bumperSprite.car = carSprite;
        
        this.game.physics.arcade.enable(carSprite); // enable .body property
        //carSprite.body.immovable = true;
        this.game.physics.arcade.enable(bumperSprite);
        
        this.changeOrigin(carSprite,true);
        
        this.carGroup.add(carSprite);
        this.bumperGroup.add(bumperSprite);
    },
    
    incrementScore: function(car) 
    {
        //console.log(car.number,car.exists,car.bumper.exists,' out of bounds');
        this.playerScore += 100;
        //car.bumper.kill();
        //play audio
        this.goalSound.play();
        // redraw a new score
        this.scoreLabel.text = "Счет: "+this.playerScore;
        this.checkLevel();
    },
    
    showScore: function() 
    {
        //score text
        var text = "Счет: 0";
        var style = { font: "20px Arial", fill: "#555", align: "center" };
        this.scoreLabel = this.game.add.text(this.game.width-150, this.game.height - 50, text, style);
        //this.scoreLabel.fixedToCamera = true;
    },
    
    checkLevel: function()
    {
        if (this.playerScore && this.playerScore%this.settings.nextlevelScore == 0) {
            
            if (this.velocityIntervalTrigger) {
                this.settings.velocity  = this.settings.startVelocity * 1/Math.pow(1+parseFloat(this.delta_velocity),this.pow_velocity);
                this.delta_velocity += this.delta_velocity;
            }
            else {
                this.settings.interval = this.settings.startInterval * 1/Math.pow(1+parseFloat(this.delta_interval),this.pow_interval);
                this.delta_interval += this.delta_interval;
            }
            this.velocityIntervalTrigger = !this.velocityIntervalTrigger;
            
            //this.settings.angular -= parseInt(this.delta_angular);
            this.settings.angular = (Math.PI * this.map.tileWidth * this.turnFactor / (2 * this.settings.velocity)) * 1000;
            this.settings.canTurn = this.toggle_canturn === true ? !this.settings.canTurn : this.settings.canTurn;
            
            this.carGroup.forEachAlive(function(carSprite){
                switch(carSprite.from) {
                    case 'west':
                        carSprite.origVelocityY = 0;
                        carSprite.origVelocityX = this.settings.velocity;
                        break;

                    case 'east':
                        carSprite.origVelocityY = 0;
                        carSprite.origVelocityX = -this.settings.velocity;
                        break; 

                    case 'north':
                        carSprite.origVelocityY = this.settings.velocity;
                        carSprite.origVelocityX = 0;
                        break;

                    case 'south':
                        carSprite.origVelocityY = - this.settings.velocity;
                        carSprite.origVelocityX = 0;
                        break; 
                }
                carSprite.velocityY = carSprite.origVelocityY;
                carSprite.velocityX = carSprite.origVelocityX;
                if (carSprite.isMoving && !carSprite.isWaiting) {
                    carSprite.body.velocity.y = carSprite.origVelocityY;
                    carSprite.body.velocity.x = carSprite.origVelocityX;
                }
                carSprite.bumper.body.velocity.x = carSprite.body.velocity.x;
                carSprite.bumper.body.velocity.y = carSprite.body.velocity.y;
            },this);
            
            //this.game.time.events.remove(this.mainLoop);
            //this.game.time.events.add(2000, function(){
                //this.mainLoop = this.game.time.events.loop(Phaser.Timer.SECOND*this.settings.interval, this.respawnCar, this);
            //}, this);
            
            console.log('level+',this.settings);
            this.level++;
            this.levelInfo.text = "Информация о сложности:\nСкорость,пикс/с: "+this.settings.velocity+"\nИнтервал между машинами,с: "+this.settings.interval+"\nСкорость поворота, град/мс: "+this.settings.angular+"\nПовороты разрешены: "+(this.settings.canTurn ? "Да":"Нет")+"\nИнтервал с разбросом: "+(this.settings.offsetEnabled ? "Да":"Нет")+"\nВеличина разброса,с: "+this.settings.offset+"\nПереключение поворотов: "+(this.toggle_canturn ? "Да":"Нет");
        }
    },
    
    showLevelInfo: function() 
    {
        //score text
        var text = "Информация о сложности:\nСкорость,пикс/с: "+this.settings.velocity+"\nИнтервал между машинами,с: "+this.settings.interval+"\nСкорость поворота, град/мс: "+this.settings.angular+"\nПовороты разрешены: "+(this.settings.canTurn ? "Да":"Нет")+"\nИнтервал с разбросом: "+(this.settings.offsetEnabled ? "Да":"Нет")+"\nВеличина разброса,с: "+this.settings.offset+"\nПереключение поворотов: "+(this.toggle_canturn ? "Да":"Нет");
        var style = { font: "14px Arial", fill: "#000"};
        this.levelInfo = this.game.add.text(5, this.game.height - 150, text, style);
    },
    
    changeOrigin: function(carSprite, creating) 
    {
        //console.log('apply route');
        // get randomly startPosition
        var startPosition = this.getStartPosition();
        //var startPosition = this.startPositions[0];

        // set position
        carSprite.x = startPosition.x;
        carSprite.y = startPosition.y;
        
        carSprite.from = startPosition.properties.from;
        this.applyRoute(carSprite, true);
        
        if (creating != true) {
            carSprite.revive();
            carSprite.bumper.revive();
        }
        //console.log(carSprite.number,carSprite.exists,carSprite.bumper.exists);
    },
    
    getStartPosition: function() 
    {
        var basePoint = 10,
            multi = 3,
            lastPoints = this.lastStartPositionIndex === undefined ? basePoint * multi : basePoint,
            line = (this.startPositions.length-1)*(basePoint*multi) + 1*(lastPoints),
            seed = this.game.rnd.integerInRange(0, line-1),
            idx = Math.floor(seed/(basePoint*multi));
          
        if (this.lastStartPositionIndex === undefined) {
            this.lastStartPositionIndex = idx;
        }
        else {
            if (idx != this.startPositions.length-1) {
                this.lastStartPositionIndex = idx < this.lastStartPositionIndex ? idx : idx + 1;
            }
        }
        //console.log('line:'+line+', seed:'+seed+', idx:'+idx+', posIdx:'+this.lastStartPositionIndex);
        return this.startPositions[this.lastStartPositionIndex];
        //return this.startPositions[this.game.rnd.integerInRange(0, this.startPositions.length-1)];
    },
    
    applyRoute: function(carSprite, start) 
    {
        var bumperSprite = carSprite.bumper;
    
        carSprite.turn = this.settings.canTurn ? this.getTurn() : 0;
        if (carSprite.turn === -1) {
            carSprite.frame = 1;
        }
        else if (carSprite.turn === 0) {
            carSprite.frame = 0;
        }
        else {
            carSprite.frame = 2;
        }
        switch(carSprite.from) {
            case 'west':
                if (start == true) {
                    // correct origin
                    carSprite.x += carSprite.width/2;
                    carSprite.y += carSprite.height/2;
                }
                //carSprite.x = -carSprite.width/2; // выезжаем из-за края границ, а непоявляемся сразу на карте
                carSprite.body.velocity.y = carSprite.origVelocityY = 0;
                carSprite.body.velocity.x = carSprite.origVelocityX = this.settings.velocity;
                carSprite.angle = 0;
                
                bumperSprite.width = carSprite.width/2;
                bumperSprite.height = carSprite.height;
                bumperSprite.x = carSprite.x + carSprite.width/2 + bumperSprite.width/2 + 2;
                bumperSprite.y = carSprite.y;
                //bumperSprite.body.setSize(bumperSprite.width,bumperSprite.height);
                break;

            case 'east':
                if (start == true) {
                    carSprite.x -= carSprite.width/2;
                    carSprite.y += carSprite.height/2;
                }
                //carSprite.x = this.game.world.width + carSprite.width/2;
                carSprite.body.velocity.y = carSprite.origVelocityY = 0;
                carSprite.body.velocity.x = carSprite.origVelocityX = -this.settings.velocity;
                carSprite.angle = 180;
                
                bumperSprite.width = carSprite.width/2;
                bumperSprite.height = carSprite.height;
                bumperSprite.x = carSprite.x - carSprite.width/2 - bumperSprite.width/2 - 2;
                bumperSprite.y = carSprite.y;
                //bumperSprite.body.setSize(bumperSprite.width,bumperSprite.height);
                break; 

            case 'north':
                if (start == true) {
                    carSprite.x += carSprite.width/2;
                    carSprite.y += carSprite.height/2;
                }
                carSprite.body.velocity.y = carSprite.origVelocityY = this.settings.velocity;
                carSprite.body.velocity.x = carSprite.origVelocityX = 0;
                carSprite.angle = 90;
                
                bumperSprite.width = carSprite.width;
                bumperSprite.height = carSprite.height/2;
                bumperSprite.x = carSprite.x;
                bumperSprite.y = carSprite.y + carSprite.height/2 + bumperSprite.height/2 + 2;
                break;

            case 'south':
                if (start == true) {
                    carSprite.x += carSprite.width/2;
                    carSprite.y -= carSprite.height/2;
                }
                carSprite.body.velocity.y = carSprite.origVelocityY = - this.settings.velocity;
                carSprite.body.velocity.x = carSprite.origVelocityX = 0;
                carSprite.angle = -90;
                
                bumperSprite.width = carSprite.width;
                bumperSprite.height = carSprite.height/2;
                bumperSprite.x = carSprite.x;
                bumperSprite.y = carSprite.y - carSprite.height/2 - bumperSprite.height/2 - 2;
                break; 
        }
    },
    
    getTurn: function() {
        var turn = [0,-1,1],
            seed = this.game.rnd.integerInRange(1, 10);
        
        return this.level >= seed ? turn[this.game.rnd.integerInRange(0, 2)] : 0;    
    },
    
    lightIsGreen: function(sprite) {
        return sprite.properties.state === 'green';
    },
    lightIsRed: function(sprite) {
        return sprite.properties.state === 'red';
    },
    
    checkZoneByBumper: function(bumper, zone) 
    {
        return bumper.car.from === zone.signal.from;
    },
    
    overlapBumperZone: function(bumper,zone)
    {
        var car = bumper.car,
            signal = zone.signal;
    
        if (car.isMoving) {
            if(this.lightIsRed(signal) && !Phaser.Rectangle.intersects(car.body,zone.body)) {
                car.isMoving = false;
                car.velocityX = car.body.velocity.x;
                car.velocityY = car.body.velocity.y;
                car.body.velocity.x = 0;
                car.body.velocity.y = 0;
            }
        }
        else {
            if(this.lightIsGreen(signal)) {
                car.isMoving = true;
                car.body.velocity.x = car.origVelocityX;
                car.body.velocity.y = car.origVelocityY;
            }
        }
        //console.log(car.isMoving,this.lightIsGreen(signal),car.body.velocity.x,car.velocityX);
    },
    
    checkZoneByCar: function(car, zone) 
    {
        if (car.isTurning === true || car.turn === 0) {
            return false;
        }
        //console.log('check zone by car '+car.turn+' '+car.from+' '+zone.signal.from);
        if (car.turn === 1) {
            // turn right
            return zone.signal.from === car.from;
        }
        else if (car.turn === -1) {
            // turn left
            var map = {
                'west':'south',
                'north':'west',
                'east':'north',
                'south':'east'
            };
            if (zone.signal.from === car.from) {
                car.canTurnLeft = true;
            }
            return  car.canTurnLeft && zone.signal.from === map[car.from];
        }
    },
    
    overlapCarZone: function(car,zone)
    {
        var params;
        if (car.isTurning === false) {
            car.isTurning = true;
            //car.body.velocity.x = 0;
            //car.body.velocity.y = 0;
            switch(car.from) {
                case 'west':
                    params = car.turn === 1 ? {
                        x:[car.x + this.map.tileWidth * this.turnFactor, car.x + this.map.tileWidth * this.turnFactor],
                        y:[car.y, car.y + this.map.tileHeight * this.turnFactor],
                        angle: car.angle + 90
                    } : {
                        x:[car.x + this.map.tileWidth * this.turnFactor, car.x + this.map.tileWidth * this.turnFactor],
                        y:[car.y, car.y - this.map.tileHeight * this.turnFactor],
                        angle: car.angle - 90
                    };
                    break;
                    
                case 'east':
                    params = car.turn === 1 ? {
                        x:[car.x - this.map.tileWidth * this.turnFactor, car.x - this.map.tileWidth * this.turnFactor],
                        y:[car.y, car.y - this.map.tileHeight * this.turnFactor],
                        angle: car.angle + 90
                    } : {
                        x:[car.x - this.map.tileWidth * this.turnFactor, car.x - this.map.tileWidth * this.turnFactor],
                        y:[car.y, car.y + this.map.tileHeight * this.turnFactor],
                        angle: car.angle - 90
                    };
                    break;
                    
                case 'north':
                    params = car.turn === 1? {
                        x:[car.x, car.x - this.map.tileWidth * this.turnFactor],
                        y:[car.y + this.map.tileHeight * this.turnFactor, car.y + this.map.tileHeight * this.turnFactor],
                        angle: car.angle + 90
                    } : {
                        x:[car.x, car.x + this.map.tileWidth * this.turnFactor],
                        y:[car.y + this.map.tileHeight * this.turnFactor, car.y + this.map.tileHeight * this.turnFactor],
                        angle: car.angle - 90
                    };
                    break;
                    
                case 'south':
                    params = car.turn === 1 ?  {
                        x:[car.x, car.x + this.map.tileWidth * this.turnFactor],
                        y:[car.y - this.map.tileHeight * this.turnFactor, car.y - this.map.tileHeight * this.turnFactor],
                        angle: car.angle + 90
                    } : {
                        x:[car.x, car.x - this.map.tileWidth * this.turnFactor],
                        y:[car.y - this.map.tileHeight * this.turnFactor, car.y - this.map.tileHeight * this.turnFactor],
                        angle: car.angle - 90
                    };
                    break;
            }
            car.bumper.kill();
            this.game.add.tween(car)
                .to(params, this.settings.angular,Phaser.Easing.Default,true)
                .interpolation(function(v, k){
                    return Phaser.Math.bezierInterpolation(v, k);
                })
                .onComplete.add(function(car)
                    {
                        switch(car.from) {
                            case 'west':
                                car.from = car.turn === 1 ? 'north' : 'south';
                                break;

                            case 'east':
                                car.from = car.turn === 1 ? 'south' : 'north';
                                break;

                            case 'north':
                                car.from = car.turn === 1 ? 'east' : 'west';
                                break;

                            case 'south':
                                car.from = car.turn === 1 ? 'west' : 'east';
                                break;
                        }
                        this.applyRoute(car);
                        car.bumper.revive();
                        car.isTurning = false;
                        car.canTurnLeft = false;
                    },
                    this
                );
        }
    },
    
    checkCarAhead: function(bumper, carAhead) 
    {
        /*if (bumper.car.number != carAhead.number) {
            console.log('b: '+bumper.car.number+': '+bumper.car.from+', '+carAhead.number+': '+carAhead.from);
            console.log('b: ',bumper.car.number,bumper.getBounds(),carAhead.number,carAhead.getBounds());
            console.log('b: ',bumper.exists,carAhead.exists);
        }*/
        return bumper.car.number != carAhead.number && bumper.car.from === carAhead.from;
    },
    
    overlapBumperCar: function(bumper,carAhead)
    {
        var car = bumper.car;
        car.isWaiting = true;
        car.velocityX = car.body.velocity.x;
        car.velocityY = car.body.velocity.y;
        car.body.velocity.x = 0;//carAhead.body.velocity.x;
        car.body.velocity.y = 0;//carAhead.body.velocity.y;
    },
    
    checkCrash: function(victim,initiator) 
    {
        //console.log('c: '+initiator.number+': '+initiator.from+', '+victim.number+': '+victim.from);
        //console.log('c: ',initiator.number,initiator.getBounds(),victim.number,victim.getBounds());
        return victim.from !== initiator.from && victim.inWorld && initiator.inWorld;
    },
    
    collideCars: function(victim,initiator)
    {
        if (!this.crash) {
            //console.log('collide car');
            this.crash = true;
            //play audio
            this.crashSound.play();
            //console.log(car.body.deltaX(),secondCar.body.deltaX());
            console.log('The End because of a crash');
            // stop respawn
            if (this.mainLoop) {
                this.game.time.events.remove(this.mainLoop);
            }
            
            var text = "Конец игры\n(Авария)\nЖми пробел";
            var style = { font: "20px Arial", fill: "#880000"};
            this.game.add.text(5, 5, text, style);
            
            //console.log('c: '+initiator.number+': '+initiator.from+', '+victim.number+': '+victim.from);
           // console.log('c: ',initiator.number,initiator.getBounds(),victim.number,victim.getBounds());
            //console.log('c: ',initiator.inWorld,victim.inWorld);
            this.game.paused = true;
            // run gameOver
            this.game.time.events.add(100, this.gameOver, this);
        }
    },
    
    checkCarUnder: function(victim,initiator) 
    {
        return victim.from === initiator.from 
                && initiator.isTurning === false 
                && victim.bumper.exists;
    },
    
    overlapCars: function(victim,initiator)
    {
        if (!this.crash) {
            //console.log('overlap car');
            this.crash = true;
            //console.log(car.body.deltaX(),secondCar.body.deltaX());
            console.log('The End because of a traffic jam');
            // stop respawn
            if (this.mainLoop) {
                this.game.time.events.remove(this.mainLoop);
            }
            
            var text = "Конец игры\n(Пробка)\nЖми пробел";
            var style = { font: "20px Arial", fill: "#880000"};
            this.game.add.text(5, 5, text, style);
            
            // run gameOver
            //console.log('c: '+initiator.number+': '+initiator.from+', '+victim.number+': '+victim.from);
            //console.log('c: ',initiator.number,initiator.getBounds(),victim.number,victim.getBounds());
            this.game.paused = true;
            this.game.time.events.add(2000, this.gameOver, this);
        }
    },
    
    gameOver: function() 
    {    
        //pass it the score as a parameter 
        this.game.state.start('MainMenu', true, false, this.playerScore);
    },

    //find objects in a Tiled layer that containt a property called "type" equal to a certain value
    findObjectsByType: function(type, map, layer) 
    {
        var result = [];
        map.objects[layer].forEach(function(element){
            if(element.properties.type === type) {
                //Phaser uses top left, Tiled bottom left so we have to adjust Y axis (only for tiles!!!) not for geometrical objects
                if (element.properties.geometry === undefined) {
                    element.y -= map.tileHeight;
                }
                result.push(element);
            }      
        });
        return result;
    },
  
    //create a sprite from an object
    createFromTiledObject: function(element, group) {
        var sprite = group.create(element.x, element.y, element.properties.sprite);

        //copy all properties to the sprite
        Object.keys(element.properties).forEach(function(key){
          sprite[key] = element.properties[key];
        });
        return sprite;
    }
  
};