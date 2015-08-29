var sw = require('./steamweb')('4D1FCD8C86BC1A0CD071A0F1355EE5D9');
var http = require('http');

var currentList = Array();
var version = 0;

var totalScanned = 0;

var checkedTemp = {}
var checked = {};
var thisChecked = 0;
var goneThrough = 0; // Of this version, 
var allFriendsOnline = 0; // Of this version, how many friends found to be online?

var totalProcessed = 0;

var yes = Array();

var COUNT = 5;

function searchId(id) {
    var cVersion = version;
    sw.friends(id, function(err, people) {
        if (!people) return;
        var friends = people.friends;
        for (f in friends) {
            if (checked[friends[f].steamid] || checkedTemp[friends[f].steamid]) {
                continue;
            }
            checked[friends[f].steamid] = true;
            sw.summary(friends[f].steamid, function(err, summ) {
                if (err) return;
                summ = summ.players[0];
                if (summ.personastate > 0) {
                    if (cVersion == version && summ.gameid == 440) {
                        allFriendsOnline++;
                        goneThrough++;
                        currentList.push(summ.steamid);
                    }
                    
                    var getItems = function(summ) {
                    
                        sw.items(440, summ.steamid, function(err, items) {
                            if (cVersion == version) totalProcessed++;
                            if (err || !items) {   
                                if (cVersion == version) {
                                    goneThrough--;
                                    allFriendsOnline--;
                                }
                                checked[summ.steamid] = false;
                                checkedTemp[summ.steadid] = true;
                                
                                //console.log('MINUS ' + cVersion + '.' + thisChecked,goneThrough,'total',totalProcessed,'of',summ.steamid);
                                
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
                                //console.log(cVersion + '.' + thisChecked,goneThrough,allFriendsOnline,'total',totalProcessed,'of',summ.steamid);
                            }
                            items = items.items;
                            for (var i in items) {
                                if (items[i].defindex == 5817) {
                                    console.log('http://steamcommunity.com/profiles/' + summ.steamid,'(version ' + cVersion + ')');
                                    yes.push(summ.steamid);
                                    break;
                                }
                            }
                        
                            //console.log('cmon',thisChecked,goneThrough,cVersion == version);
                        
                            if (cVersion == version && thisChecked > goneThrough * 0.75 && goneThrough > allFriendsOnline * 0.5 + 5) {
                                next();
                            }
                        });
                    }
                    
                    getItems(summ);
                }
            });
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
    
    for (var i = 0; i < COUNT; i++) {
        var id = currentList.splice(0,1);
        if (!id[0]) break;
        else searchId(id[0]);
    }
    
    if (version % 5 == 0) {
        checkedTemp = {};
    }
    
    if (currentList.length > 50) currentList = currentList.splice(currentList.length - 50);
    COUNT = Math.min(COUNT + 2, 30);
}

var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html;level=1'});
    var str = 'Total backpacks searched: <b>' + totalScanned + '</b><br><br>';
    for (var y in yes) {
        str += '<a href="http://steamcommunity.com/profiles/' + yes[y] + '">http://steamcommunity.com/profiles/' + yes[y] + '</a><br>';
    }
    res.end(str);
});

server.listen(8000);

searchId('76561197982241807');