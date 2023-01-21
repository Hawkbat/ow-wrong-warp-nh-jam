const fs = require('fs')
const path = require('path')

const baseDir = path.join(__dirname, '../planets/towers/')
fs.rmSync(baseDir, { recursive: true, force: true })
fs.mkdirSync(baseDir, { recursive: true })

const coordinateSets = [
    [0,2,5,4],
    [2,3,5],
    [1,4,2,5,3,0],
]

const TowerType = {
    base: 'B',
    forward: 'F',
    reverse: 'R',
}

const singularityMap = {}
const singularityPairMap = {}

let buildIndex = 4 + coordinateSets.reduce((p, c) => p + (1 + c.length * 2) * 4, 0) - 1

for (let s = 0; s < coordinateSets.length; s++) {
    makeTowerPlanets(TowerType.base, s, -1)
    for (let c = 0; c < coordinateSets[s].length; c++) {
        makeTowerPlanets(TowerType.forward, s, c)
    }
    for (let c = coordinateSets[s].length - 1; c >= 0; c--) {
        makeTowerPlanets(TowerType.reverse, s, c)
    }
}
makeTowerPlanets(TowerType.base, coordinateSets.length, -1)

function makeTowerPlanets(type, coordSetIndex, coordIndex) {
    makeTowerPlanet(type, coordSetIndex, coordIndex, 0)
    makeTowerPlanet(type, coordSetIndex, coordIndex, 1)
    makeTowerPlanet(type, coordSetIndex, coordIndex, 2)
    makeTowerPlanet(type, coordSetIndex, coordIndex, 3)
}

function getSingularityID(type, floorIndex, coordSetIndex, coordIndex, coord) {
    const id = `TOWER_${type}_S${coordSetIndex}_C${coordIndex}_F${floorIndex}_${coord >= 0 ? coord : 'E'}`
    return id
}

function getTargetSingularityID(direction, floorIndex, coordSetIndex, coordIndex, coord) {
    const currentSet = coordinateSets[coordSetIndex]
    const isFinalCoord =
            direction === TowerType.forward ? currentSet.indexOf(coord) === currentSet.length - 1 :
            direction === TowerType.reverse ? currentSet.indexOf(coord) === 0 :
            false
    const isWarpToFinalFloor = isFinalCoord && coordSetIndex === coordinateSets.length - 1 && floorIndex === 2
    if (isWarpToFinalFloor) return getSingularityID(TowerType.base, floorIndex + 1, coordSetIndex + 1, -1, -1)
    if (isFinalCoord) return getSingularityID(TowerType.base, floorIndex, coordSetIndex + 1, -1, -1)
    if (direction === TowerType.forward) return getSingularityID(direction, floorIndex, coordSetIndex, coordIndex + 1, -1)
    if (direction === TowerType.reverse) return getSingularityID(direction, floorIndex, coordSetIndex, (coordIndex < 0 ? currentSet.length - 1 : coordIndex - 1), -1)
    return undefined
}

function makeTowerPlanet(type, coordSetIndex, coordIndex, floorIndex) {
    const name = `Tower ${(buildIndex--).toString().padStart(3, '0')} ${type} S${coordSetIndex} C${coordIndex} F${[floorIndex]}`

    const x = (coordSetIndex * 1000)
    const y = (type === TowerType.base ? 30000 : 20000) + (floorIndex * 21)
    const z = (type === TowerType.reverse ? 10000 : 0) + (coordIndex * 1000)

    if (type === TowerType.base) console.log({ name, x, y, z })

    const currentSet = coordinateSets[floorIndex]
    const isInitialFloor = type === TowerType.base && floorIndex === 0 && coordSetIndex === 0
    const isTowerPeak = floorIndex === 3
    const isCurrentFloor = coordSetIndex === floorIndex
    const isPreviousFloor = coordSetIndex > floorIndex

    const siderealPeriod = (isPreviousFloor ? [1, -0.8, 1.5, -1.2][floorIndex] : 0)

    const singularities = []

    if (isTowerPeak) {
        if (isCurrentFloor) {
            singularities.push({
                "parentPath": `Sector/TowerPeak/Interactibles/BlackHoleEntrance`,
                "isRelativeToParent": true,
                "horizonRadius": 0.75,
                "distortRadius": 1.5,
                "type": "whiteHole",
                "hasWarpEffects": false,
                "uniqueID": getSingularityID(type, floorIndex, coordSetIndex, coordIndex, -1),
            })
            singularities.push({
                "parentPath": `Sector/TowerPeak/Interactibles/BlackHoleExit`,
                "isRelativeToParent": true,
                "horizonRadius": 2,
                "distortRadius": 5,
                "type": "blackHole",
                "hasWarpEffects": false,
                "targetStarSystem": "SolarSystem",
                "uniqueID": "TOWER_WARP_EXIT",
            })
        }
    } else {
        for (let i = -1; i < 6; i++) {
            const isEntrance = i === -1
            if (!isCurrentFloor && !isEntrance) continue
            
            const isReverseCoord =
                type === TowerType.base ? i === currentSet[currentSet.length - 1] :
                type === TowerType.reverse ? true :
                false
    
            const isForwardCoord =
                type === TowerType.base ? i === currentSet[0] :
                type === TowerType.forward ? true :
                false
    
            const isCurrentCoord = i === currentSet[coordIndex]
    
            const isPrevCoord =
                type === TowerType.base ? isPreviousFloor :
                type === TowerType.forward ? isPreviousFloor || (isCurrentFloor && currentSet.includes(i) && currentSet.indexOf(i) < coordIndex) :
                type === TowerType.reverse ? isPreviousFloor || (isCurrentFloor && currentSet.includes(i) && currentSet.indexOf(i) > coordIndex) :
                false
            
            const isNextCoord =
                type === TowerType.base ? isCurrentFloor && (i === currentSet[0] || i === currentSet[currentSet.length - 1]) :
                type === TowerType.forward ? isCurrentFloor && i === currentSet[coordIndex + 1] :
                type === TowerType.reverse ? isCurrentFloor && i === currentSet[coordIndex - 1] :
                false
    
            const direction = isForwardCoord ? TowerType.forward : isReverseCoord ? TowerType.reverse : TowerType.base
    
            const parentPath = isEntrance ?
                `Sector/TowerCenter/Interactibles/BlackHoleEntrance` :
                `Sector/TowerCenter/Interactibles/BlackHolePivot${i}/BlackHole`
            const singularityType = isPrevCoord || isCurrentCoord || isEntrance ? 'whiteHole' : 'blackHole'        
            const uniqueID = getSingularityID(type, floorIndex, coordSetIndex, coordIndex, i)
            const pairedSingularity = isNextCoord ? getTargetSingularityID(direction, floorIndex, coordSetIndex, coordIndex, i) : undefined
    
            const singularityJson = {
                "parentPath": parentPath,
                "isRelativeToParent": true,
                "horizonRadius": 0.75,
                "distortRadius": 1.5,
                "type": singularityType,
                "hasWarpEffects": false,
                "uniqueID": uniqueID,
                "pairedSingularity": pairedSingularity
            }
    
            if (singularityMap[uniqueID]) {
                console.log('Duplicate singularity', uniqueID)
            }
    
            singularityMap[uniqueID] = singularityJson
            if (pairedSingularity) singularityPairMap[uniqueID] = pairedSingularity
            
            singularities.push(singularityJson)
        }
    }

    const spawnJson = (isInitialFloor) ? {
        "playerSpawnPoint": {
            "x": 0,
            "y": 2,
            "z": 0
        },
        "playerSpawnRotation": {
            "x": 0,
            "y": 0,
            "z": 0
        },
        "startWithSuit": true,
        "shipSpawnPoint": {
            "x": 0,
            "y": -50000,
            "z": 0
        },
        "shipSpawnRotation": {
            "x": 0,
            "y": 0,
            "z": 0
        }
    } : undefined

    const details = []
    const nomaiText = []
    const audioVolumes = []
    if (isTowerPeak) {
        details.push({
            "assetBundle": "assetbundles/puzzleship",
            "path": "Assets/Mod Assets/Objects/TowerPeak.prefab"
        })
        details.push({
            "parentPath": "Sector/TowerPeak/Props/Quercus",
            "isRelativeToParent": true,
            "path": "Comet_Body/DeadNomai_Body/Prefab_NOM_Dead_Suit"
        })
        if (isCurrentFloor) {
            nomaiText.push({
                "parentPath": "Sector/TowerPeak/Props/Text Pivot 0/Text",
                "isRelativeToParent": true,
				"position": { "x": 0, "y": 0, "z": 0 },
				"rotation": { "x": 0, "y": 0, "z": 0 },
                "type": "wall",
                "seed": 42,
                "xmlFile": "planets/TEXT_TOWER_PEAK_0.xml",
                "arcInfo": [
					{"type": "adult", "position": { "x": 0, "y": 0 }}
                ]
            })
            
            nomaiText.push({
                "parentPath": "Sector/TowerPeak/Props/Text Pivot 1/Text",
                "isRelativeToParent": true,
				"position": { "x": 0, "y": 0, "z": 0 },
				"rotation": { "x": 0, "y": 0, "z": 0 },
                "type": "wall",
                "seed": 42,
                "xmlFile": "planets/TEXT_TOWER_PEAK_1.xml",
                "arcInfo": [
					{"type": "adult", "position": { "x": 0, "y": 0 }}
                ]
            })
            nomaiText.push({
                "parentPath": "Sector/TowerPeak/Props/Text Pivot 2/Text",
                "isRelativeToParent": true,
				"position": { "x": 0, "y": 0, "z": 0 },
				"rotation": { "x": 0, "y": 0, "z": 0 },
                "type": "wall",
                "seed": 42,
                "xmlFile": "planets/TEXT_TOWER_PEAK_2.xml",
                "arcInfo": [
					{"type": "adult", "position": { "x": 0, "y": 0 }}
                ]
            })
            nomaiText.push({
                "parentPath": "Sector/TowerPeak/Props/Text Pivot 3/Text",
                "isRelativeToParent": true,
				"position": { "x": 0, "y": 0, "z": 0 },
				"rotation": { "x": 0, "y": 0, "z": 0 },
                "type": "wall",
                "seed": 43,
                "xmlFile": "planets/TEXT_TOWER_PEAK_3.xml",
                "arcInfo": [
					{"type": "adult", "position": { "x": 0, "y": 0 }},
					{"type": "adult", "position": { "x": 0, "y": 1 }, "zRotation": 300 },
					{"type": "adult", "position": { "x": 0.25, "y": 1.35 }, "zRotation": 75, "mirror": true },
					{"type": "child", "position": { "x": 0.25, "y": 1.9 }}
                ]
            })
            nomaiText.push({
                "parentPath": "Sector/TowerPeak/Props/Text Pivot 4/Text",
                "isRelativeToParent": true,
				"position": { "x": 0, "y": 0, "z": 0 },
				"rotation": { "x": 0, "y": 0, "z": 0 },
                "type": "wall",
                "seed": 44,
                "xmlFile": "planets/TEXT_TOWER_PEAK_4.xml",
                "arcInfo": [
					{"type": "adult", "position": { "x": 0, "y": 0 }}
                ]
            })
        }
    } else {
        details.push({
            "assetBundle": "assetbundles/puzzleship",
            "path": "Assets/Mod Assets/Objects/TowerCenter.prefab"
        })
        if (!isCurrentFloor || type !== TowerType.base) {
            details.push({
                "assetBundle": "assetbundles/puzzleship",
                "path": "Assets/Mod Assets/Objects/TowerRoomPlug.prefab"
            })
        }
    }
    if (!isTowerPeak) {
        for (let i = 0; i <= coordSetIndex; i ++) {
            if (i === coordSetIndex && coordIndex < 0) continue
            details.push({
                "parentPath": `Sector/TowerCenter/Props/Coordinate Sigil ${i}`,
                "isRelativeToParent": true,
                "assetBundle": "assetbundles/puzzleship",
                "path": `Assets/Mod Assets/Textures/Coordinates/Objects/COORD_${i === coordSetIndex && type === TowerType.reverse ? 'R' : 'F'}_S${i}_C${i < coordSetIndex ? coordinateSets[i].length - 1 : coordIndex}.prefab`
            })
        }
    }
    if (isCurrentFloor) {
        if (isInitialFloor) {
            audioVolumes.push({
                "audio": "BH_Observatory",
                "track": "music",
                "radius": 100
            })
        } else if (isTowerPeak) {
            audioVolumes.push({
                "audio": "DB_VesselDiscovery",
                "track": "music",
                "radius": 100
            })
        } else {
            audioVolumes.push({
                "audio": "NomaiRuinsBaseTrack",
                "track": "music",
                "radius": 100
            })
        }
        if (type === TowerType.base && !isInitialFloor) {
            audioVolumes.push({
                "audio": "NomaiVesselPowerUp",
                "track": "environmentUnfiltered",
                "radius": 100,
                "loop": false
            })
        }
    }
    
    const json = {
        "$schema": "https://raw.githubusercontent.com/Outer-Wilds-New-Horizons/new-horizons/main/NewHorizons/Schemas/body_schema.json",
        "name" : name,
        "starSystem": "QuantumTowerRealm",
        "Base": {
            "groundSize": 0,
            "surfaceSize": 10,
            "surfaceGravity": 0,
            "hasMapMarker": false,
            "ambientLight": 0.8
        },
        "ReferenceFrame": {
            "enabled": false
        },
        "Spawn": spawnJson,
        "Orbit": {
            "staticPosition": {
                "x": x,
                "y": y,
                "z": z
            },
            "isStatic": true,
            "siderealPeriod": siderealPeriod,
            "showOrbitLine": false
        },
        "Props": {
            "details": details,
            "singularities": singularities,
            "nomaiText": nomaiText,
        },       
        "Volumes": {
            "audioVolumes": audioVolumes,
        },
    }

    fs.writeFileSync(path.join(baseDir, `${name}.json`), JSON.stringify(json), 'utf8')
}

const unpaired = Object.fromEntries(Object.entries(singularityPairMap).filter(([k, v]) => !singularityMap[v]))

if (Object.keys(unpaired).length) {
    console.log('Unpaired singularities')
    console.log(unpaired)
}
