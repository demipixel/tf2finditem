var sw = require('./steamweb')('4D1FCD8C86BC1A0CD071A0F1355EE5D9');

var mongoose = require('mongoose');
var express = require('express');
var app = express();

var fs = require('fs');

var ioapp = express();
var http = require('http').Server(ioapp);
var io = require('socket.io')(http);

var START_TIME = Date.now();

http.listen(4000, function() {
    console.log('Listening for socket.io on 4000');
});

app.set('view engine', 'ejs');

var MongoDB = mongoose.connect('mongodb://localhost:27017').connection;

MongoDB.on('error', function(err) {
	console.log('Database error: ' + err.message);
});

MongoDB.once('open', function() {
	console.log('Connected to database');
	searchId('76561198023936575');
});

var db = {
	check: require('./schemas/check')(mongoose)
};

var currentList = Array();
var version = 0;

var totalScanned = 0;

var checkedTemp = {};
var thisChecked = 0;
var goneThrough = 0; // Of this version, 
var allFriendsOnline = 0; // Of this version, how many friends found to be online?

var totalProcessed = 0;

var COUNT = 3;

function searchId(id) {
    var cVersion = version;
    sw.friends(id, function(err, people) {
        if (!people) return;
        var friends = people.friends;
        var cantFind = 0;
        for (f in friends) {
           /* if (checked[friends[f].steamid] || checkedTemp[friends[f].steamid]) {
                continue;
            }
            checked[friends[f].steamid] = true;
            checkBackpack(id);*/
            var friendId = friends[f].steamid;
            
            if (checkedTemp[friends[f].steamid]) continue;
            
            //setTimeout(function() {
                db.check.find({ steamid: friendId }, function(err, exists) {
                    var id = this._conditions.steamid;
                    
                    //console.log('found ' + id);
                    
                    if (checkedTemp[id]) return;
                    checkedTemp[id] = true;
                    
                    if (!exists || !exists.length) {
                        var id = this._conditions.steamid;
                        setTimeout(function() {
                            checkBackpack(id, cVersion);
                        }, 0);
                    
                        var newCheck = new db.check({
                            steamid: id
                        });
                        newCheck.save();
                    } else if (exists[0].ignore && exists[0].used == false) {
                        checkBackpack(exists[0].steamid, cVersion);
                        exists[0].ignore = false;
                        exists[0].date = new Date();
                        exists[0].save();
                    } else {
                        cantFind++;
                        if (cantFind == friends.length) {
                            console.log('stuck');
                            for (var i = 0; i < 2; i++) {
                                setTimeout(function() {
                                    searchId(friends[Math.floor(Math.random() * friends.length)].steamid);
                                }, 0);
                            }
                        }
                    }
                });
            //}, 0);
        }
    });
}

function checkBackpack(id, cVersion) {
    sw.summary(id, function(err, summ) {
        if (err) return;
        summ = summ.players[0];
        if (summ && summ.personastate > 0) {
            if (cVersion == version) {
                allFriendsOnline++;
                goneThrough++;
                if (summ.gameid == 440 || true) currentList.push(summ.steamid);
            }
        
            var getItems = function(summ) {
        
                sw.items(440, summ.steamid, function(err, items) {
                    if (cVersion == version) totalProcessed++;
                    if (err || !items) {   
                        if (cVersion == version) {
                            goneThrough--;
                            allFriendsOnline--;
                        }
                        db.check.remove({ steamid: summ.steamid });
                        //checked[summ.steamid] = false;
                        checkedTemp[summ.steadid] = true;
                    
                        //console.log('MINUS ' + cVersion + '.' + thisChecked,goneThrough,'total',totalProcessed,'of',allFriendsOnline);
                    
                        if (cVersion == version && thisChecked > goneThrough * 0.75 && goneThrough > allFriendsOnline * 0.5 + 5) {
                            next();
                        } else if (cVersion == version && thisChecked == 0 && goneThrough < 10) {
                            next();
                        }
                        return;
                    }
                    totalScanned++;
                    //console.log('Checking bp v'+cVersion);
                    if (cVersion == version) {
                        thisChecked++;
                        //console.log(cVersion + '.' + thisChecked,goneThrough,'total',totalProcessed,'of',allFriendsOnline);
                    }
                    items = items.items;
                    for (var i in items) {
                        if (items[i].defindex == 5817) {
                            console.log('http://steamcommunity.com/profiles/' + summ.steamid,'(version ' + cVersion + ')');
                            //yes.push(summ.steamid);
                            db.check.find({ steamid: summ.steamid }, function(err, checks) {
                                if (checks && checks.length) {
                                    checks[0].yes = true;
                                    checks[0].name = summ.personaname;
                                    
                                    io.emit('new', checks[0]);
                                    
                                    checks[0].save();
                                }
                            });
                            break;
                        }
                    }
            
                    //console.log('cmon',thisChecked,goneThrough,cVersion == version);
                
    //                             console.log(cVersion == version, thisChecked > goneThrough * 0.75, goneThrough > allFriendsOnline * 0.5 + 5);
            
                    if (cVersion == version && thisChecked > goneThrough * 0.75 && goneThrough > allFriendsOnline * 0.5 + 5) {
                        next();
                    }
                });
            }
        
            getItems(summ);
        }
    });
}

function next() {        
    console.log('passed version: ' + version + '. Found ' + thisChecked + '. Gone through: ' + goneThrough + '. Total: ' + totalScanned + '. Friends: ' + allFriendsOnline + '. length: ' + currentList.length);
    
    version++;
    thisChecked = 0;
    goneThrough = 0;
    allFriendsOnline = 0;
    totalProcessed = 0;
    
    setTimeout(function() {
        for (var i = 0; i < COUNT; i++) {
            var id = currentList.splice(0,1);
            if (!id[0]) break;
            else searchId(id[0]);
        }
    }, 0);
    
    if (version % 5 == 0) {
        checkedTemp = {};
    }
    
    if (currentList.length > 50) currentList = currentList.splice(currentList.length - 50);
    COUNT = 15;
}

function markCompleted(id) {
    db.check.find({ steamid: id }, function(err, check) {
        if (check && check.length) {
            check[0].used = true;
            check[0].save();
        }
    });
}

/*var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html;level=1'});
    var str = 'Total backpacks searched: <b>' + totalScanned + '</b><br><br>';
    for (var y in yes) {
        str += '<a href="http://steamcommunity.com/profiles/' + yes[y] + '">http://steamcommunity.com/profiles/' + yes[y] + '</a><br>';
    }
    res.end(str);
});*/

setInterval(function() {
    console.log('Setting ignores');
    db.check.find({ date: { $gt: new Date((new Date()) - 1000*60*60) }, ignore: false}, function(err, checks) {
        if (checks) {
            checks.forEach(function(doc) {
                doc.ignore = true;
                doc.yes = false;
                doc.save();
            });
        }
    });
}, 1000*60*5); // Every 5 minutes

setInterval(function() {
    io.emit('stats', {
        time: Math.floor((Date.now() - START_TIME)/1000/60 * 10)/10,
        total: totalScanned
    });
},1000*6);

var live = false;

fs.exists('production', function(exists) {
	local = !exists;
	live = !local;
	var port = process.env.PORT || (exists ? 80 : 3000);
	var server = app.listen(port, function () {
	  var host = server.address().address;
	  var port = server.address().port;

	  console.log('Server live at http://localhost:' + port);
	  console.log(host);
	});
});

app.get('/', function(req, res) {
    db.check.find({ yes: true, ignore: false, used: false }, function(err, checks) {
        res.render('index.ejs', {
            list: checks,
            live: live,
            time: (Date.now() - START_TIME)/1000,
            total: totalScanned
        });
    });
});




var closeCalls = Array();

io.on('connection', function(socket) {
    socket.on('try', function(id) {
        for (var c in closeCalls) {
            if (closeCalls[c] == id) return;
        }
        
        closeCalls.push(id);
        closeCalls.splice(0, 1);
        
        socket.emit('open', id);
        io.emit('clicked', id);
        db.check.find({ steamid: id }, function(err, checks) {
            if (checks && checks.length) {
                checks[0].used = true;
                checks[0].save();
                console.log('Removing',id);
            } else {
                console.log('Can\'t find user clicked:',id);
            }
        });
    });
});






// DEBUGING


/*var memwatch = require('memwatch-next');
var heapdump = require('heapdump');

memwatch.on('stats', function(stats) {
    console.log(stats);
});

memwatch.on('leak', function(info) {
 console.error(info);
 var file = './myapp-' + process.pid + '-' + Date.now() + '.heapsnapshot';
 heapdump.writeSnapshot(file, function(err){
   if (err) console.error(err);
   else console.error('Wrote snapshot: ' + file);
  });
});*/