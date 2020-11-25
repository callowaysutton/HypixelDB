"use strict"

const config = require("./config.json")

const asyncfs = require("fs").promises,
    fs = require("fs"),
    sha1 = require("sha1")

const { McAPI, HypixelAPI, OptifineAPI } = require("./api")

const mc = new McAPI()
const hypixel = new HypixelAPI(config.key)
const optifine = new OptifineAPI()

let queriesInPastMin = 0
let queryLimit = 120
let lastLb = ""

let queue = []
let users = []

if (require.resolve("./db/queue.json")) {
    queue = require("./db/queue.json")
    users = require("./db/users.json")
} else {
    fs.writeFileSync("./db/queue.json", "[]")
    fs.writeFileSync("./db/users.json", "{}")
}

let usersFile = fs.openSync("./db/users.json", "r+")

const setup = async () => {
    if (queue.length == 0) {
        const keyInfo = await hypixel.getKeyInfo()
        queriesInPastMin = keyInfo.queriesInPastMin+1
        queryLimit = keyInfo.limit
        const uuid = await mc.getUuid("confiscated")
        queue.push(uuid)
    }
}

const scrapeUser = async (uuid) => {
    const date = new Date()
    try {
        const friends = await hypixel.getFriends(uuid)
        const profile = await hypixel.getPlayer(uuid)
        const guild = await hypixel.getGuild(uuid)
        const username = profile.displayname
        const optiCape = await optifine.getCape(username)
        const optiCapeHash = await optifine.getCapeHash(username)
        const mcProfile = await mc.getProfile(uuid)
        const skin = mcProfile.skin
        const skinHash = mcProfile.skinHash
        const mcCape = mcProfile.cape
        const mcCapeHash = mcProfile.capeHash

        if (optiCape != "") {
            const folder = `./db/textures/capes/${optiCapeHash.substring(0, 2)}`

            if (fs.existsSync(folder)) {
                asyncfs.writeFile(`${folder}/${optiCapeHash}.png`, optiCape)
            } else {
                await asyncfs.mkdir(folder, {recursive: true})
                await asyncfs.writeFile(`${folder}/${optiCapeHash}.png`, optiCape)
            }
        }

        if (mcCape) {
            const folder = `./db/textures/capes/${mcCapeHash.substring(0, 2)}`

            if (fs.existsSync(folder)) {
                asyncfs.writeFile(`${folder}/${mcCapeHash}.png`, mcCape)
            } else {
                await asyncfs.mkdir(folder, {recursive: true})
                await asyncfs.writeFile(`${folder}/${mcCapeHash}.png`, mcCape)
            }
        }

        if (skin) {
            const folder = `./db/textures/skins/${skinHash.substring(0, 2)}`

            if (fs.existsSync(folder)) {
                asyncfs.writeFile(`${folder}/${skinHash}.png`, skin)
            } else {
                await asyncfs.mkdir(folder, {recursive: true})
                await asyncfs.writeFile(`${folder}/${skinHash}.png`, skin)
            }
        }

        profile.optiCape = optiCapeHash
        profile.mcCape = mcCapeHash
        profile.skin = skinHash

        if (queue.length < 100000) {
            for (const friend of friends) {
                if (friend.uuidSender != uuid && !queue.includes(friend.uuidSender) && !users[friend.uuidSender]) {
                    queue.push(friend.uuidSender)
                }
                if (friend.uuidReciever != uuid && !queue.includes(friend.uuidReciever) && !users[friend.uuidReciever]) {
                    queue.push(friend.uuidReciever)
                }
            }

            if (guild) {
                for (const member of guild.members) {
                    if (!queue.includes(member.uuid) && !users[member.uuid]) {
                        queue.push(member.uuid)
                    }
                }
            }
        }

        profile.friends = friends
        profile.guild = guild
        profile.indexTime = date.getTime()

        const stat = await asyncfs.stat("./db/users.json")
        const size = stat.size
        const read = Buffer.alloc(1)
        fs.readSync(usersFile, read, 0, 1, size-2)
        const buf = Buffer.from(`${read.toString() == "{" ? "" : ","}"${uuid}":${JSON.stringify(profile)}}`)

        fs.writeSync(
            usersFile,
            buf,
            0,
            buf.length,
            size-1
        )

        users[uuid] = profile
    } catch (err) {
        console.log(err)
    }

    queue.shift()

    await asyncfs.writeFile("./db/queue.json", JSON.stringify(queue))

    queriesInPastMin += 3

    if (queriesInPastMin+3 > queryLimit) {
        setTimeout(() => {
            scrapeUser(queue[0])
            queriesInPastMin = 0
        }, 1000*(60-date.getSeconds()))
    } else {
        scrapeUser(queue[0])
    }
}

const indexLeaderboards = async () => {
    const date = new Date()
    const leaderboards = await hypixel.getLeaderboards()
    queriesInPastMin++
    if (JSON.stringify(leaderboards) != lastLb) {
        const folder = `./db/lb/${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDay()}`
        const content = JSON.stringify(leaderboards)

        if (fs.existsSync(folder)) {
            asyncfs.writeFile(`${folder}/${sha1(content)}.json`, content)
        } else {
            await asyncfs.mkdir(folder, {recursive: true})
            asyncfs.writeFile(`${folder}/${sha1(content)}.json`, content)
        }
        lastLb = content
    }
    setTimeout(() => {
        indexLeaderboards()
        queriesInPastMin = 0
    }, 60000)
}

(async () => {
    await setup()
    indexLeaderboards()
    await scrapeUser(queue[0])
})()