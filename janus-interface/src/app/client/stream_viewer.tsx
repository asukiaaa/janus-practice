'use client'
import { useEffect } from "react"
import Janus from "janus-gateway-js";
// const Janode = require('janode')
// import { conn } from "janode";

// import dynamic from "next/dynamic"
// const Janus = dynamic(() => import("janus-gateway-js"), {
//   ssr: false
// })

// import Janus from "./janus"

// https://github.com/sjkummer/janus-gateway-js

const StreamViewer = () => {
  useEffect(() => {
    console.log('on enter')
    Janus.init({
      debug: true, callback: () => {
        console.log('on callback')
      }
    })
    return () => {
      console.log('on leave')
    }
  }, [])
  // console.log("janus", Janus.init, "hoge")
  // const connection = await Janode.connect()
  // const connection = await conn()
  // const janus = new Janus.Client("wss://localhost:8089")

  // const janus = new Janus.Client("ws://localhost:8188")
  // console.log("janus", janus);
  // try {
  //   const connection = await janus.createConnection("client")
  //   console.log('connection', connection, Object.getOwnPropertyNames(connection))
  //   const session = connection.createSession()
  //   console.log('session', session)
  //   const plugin = session.attachPlugin(Janus.StreamingPlugin.NAME)
  //   console.log('plugin', plugin)
  // } catch (e) {
  //   console.log("error", e)
  // }
  return <div>TODO</div>
}

export { StreamViewer }
