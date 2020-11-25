const fetch = require("node-fetch"),
    sha1 = require("sha1")

class McAPI {
    constructor() {

    }

    getStatus = async () => {
        const res = await fetch("https://status.mojang.com/check")

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return { status: res.status, text: body, json }
    }

    getUuid = async (username) => {
        const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.id
    }

    getHistory = async (uuid) => {
        const res = await fetch(`https://api.mojang.com/user/profiles/${uuid}/names`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json
    }

    getProfile = async (uuid) => {
        const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            try {
                json = JSON.parse(body)
            } catch {

            }
        }

        const texture = JSON.parse(Buffer.from(json.properties[0].value, "base64").toString("utf8"))
        const skinUrl = texture.textures.SKIN
        const capeUrl = texture.textures.CAPE

        let cape = undefined
        let skin = undefined
        let skinHash = undefined
        let capeHash = undefined

        if (skinUrl) {
            const skinRes = await fetch(skinUrl.url)

            skin = await skinRes.buffer()
            skinHash = sha1(skin)
        }
        
        if (capeUrl) {
            const capeRes = await fetch(capeUrl.url)

            cape = await capeRes.buffer()
            capeHash = sha1(cape)
        }

        if (cape && skin) {
            return { id: json.id, name: json.name, properties: json.properties, texture, cape, capeHash, skin, skinHash}
        } else if (skin) {
            return { id: json.id, name: json.name, properties: json.properties, texture, skin, skinHash}
        } else if (cape) {
            return { id: json.id, name: json.name, properties: json.properties, texture, cape, capeHash}
        } else {
            return { id: json.id, name: json.name, properties: json.properties, texture, cape, capeHash, skin, skinHash}
        }
    }
}

class HypixelAPI {
    constructor(key) {
        this.key = key
    }

    getPlayer = async (uuid) => {
        const res = await fetch(`https://api.hypixel.net/player?key=${this.key}&uuid=${uuid}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.player
    }

    getGuild = async (uuid) => {
        const res = await fetch(`https://api.hypixel.net/guild?key=${this.key}&player=${uuid}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.guild
    }

    getPlayerCount = async () => {
        const res = await fetch(`https://api.hypixel.net/playerCount?key=${this.key}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.playerCount
    }

    getStatus = async (uuid) => {
        const res = await fetch(`https://api.hypixel.net/status?key=${this.key}&uuid=${uuid}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.status
    }

    getLeaderboards = async () => {
        const res = await fetch(`https://api.hypixel.net/leaderboards?key=${this.key}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.leaderboards
    }

    getRecentGames = async (uuid) => {
        const res = await fetch(`https://api.hypixel.net/recentGames?key=${this.key}&uuid=${uuid}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.recentGames
    }

    getGetWatchdogStats = async () => {
        const res = await fetch(`https://api.hypixel.net/watchdogstats?key=${this.key}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.watchdogstats
    }

    getFriends = async (uuid) => {
        const res = await fetch(`https://api.hypixel.net/friends?key=${this.key}&uuid=${uuid}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json.records
    }

    getKeyInfo = async () => {
        const res = await fetch(`https://api.hypixel.net/key?key=${this.key}`)

        const body = await res.text()
        let json = {}

        if (res.status == 200) {
            json = JSON.parse(body)
        }

        return json
    }
}

class OptifineAPI {
    constructor() {

    }

    getCape = async (user) => {
        const res = await fetch(`http://s.optifine.net/capes/${user}.png`)

        const body = await res.buffer()

        if (res.status == 200)
            return body
        else
            return ""
    }

    getCapeHash = async (user) => {
        const data = await this.getCape(user)

        if (data == "")
            return ""
        else
            return sha1(data)
    }
}

module.exports = {
    McAPI: McAPI,
    HypixelAPI: HypixelAPI,
    OptifineAPI: OptifineAPI
}