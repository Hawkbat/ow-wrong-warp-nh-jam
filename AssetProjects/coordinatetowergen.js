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

let buildIndex = coordinateSets.reduce((p, c) => p + (1 + c.length * 2) * 3, 0) - 1

for (let s = 0; s < coordinateSets.length; s++) {
    makeTowerPlanets(TowerType.base, s, -1)
    for (let c = 0; c < coordinateSets[s].length; c++) {
        makeTowerPlanets(TowerType.forward, s, c)
    }
    for (let c = coordinateSets[s].length - 1; c >= 0; c--) {
        makeTowerPlanets(TowerType.reverse, s, c)
    }
}

function makeTowerPlanets(type, coordSetIndex, coordIndex) {
    makeTowerPlanet(type, coordSetIndex, coordIndex, 0)
    makeTowerPlanet(type, coordSetIndex, coordIndex, 1)
    makeTowerPlanet(type, coordSetIndex, coordIndex, 2)
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
    if (isFinalCoord) return getSingularityID(TowerType.base, floorIndex + 1, coordSetIndex + 1, -1, -1)
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
    const isCurrentFloor = coordSetIndex === floorIndex
    const isPreviousFloor = coordSetIndex > floorIndex

    const siderealPeriod = (isPreviousFloor ? [1, -1, 1.5][floorIndex] : 0)

    const singularities = []

    for (let i = -1; i < 6; i++) {
        if (!isCurrentFloor) break
        const isEntrance = i === -1
        
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

    const spawnJson = (type === TowerType.base && floorIndex === 0 && coordSetIndex === 0) ? {
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
            "y": -50,
            "z": 0
        },
        "shipSpawnRotation": {
            "x": 0,
            "y": 0,
            "z": 0
        }
    } : undefined

    const json = {
        "$schema": "https://raw.githubusercontent.com/Outer-Wilds-New-Horizons/new-horizons/main/NewHorizons/Schemas/body_schema.json",
        "name" : name,
        "starSystem": "QuantumTowerRealm",
        "Base": {
            "groundSize": 0,
            "surfaceSize": 10,
            "surfaceGravity": 0,
            "hasMapMarker": true,
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
            "details": [
                {
                    "assetBundle": "assetbundles/puzzleship",
                    "path": "Assets/Mod Assets/Objects/TowerCenter.prefab"
                }
            ],
            "singularities": singularities,
        }
    }

    fs.writeFileSync(path.join(baseDir, `${name}.json`), JSON.stringify(json), 'utf8')
}

const unpaired = Object.fromEntries(Object.entries(singularityPairMap).filter(([k, v]) => !singularityMap[v]))

if (Object.keys(unpaired).length) {
    console.log('Unpaired singularities')
    console.log(unpaired)
}
