// 'use client'
import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Janus from 'janus-gateway-js'

function App() {
  const [count, setCount] = useState(0)
  const refVideo = useRef(null);
  const janus = new Janus.Client('ws://localhost:8188');
  useEffect(() => {
    console.log('on useEffect')
    const job = async () => {
      console.log('todo')
      // https://github.com/sjkummer/janus-gateway-js/blob/master/test/integration/streaming.js
      const connection = await janus.createConnection('id')
      console.log('connected')
      const session = await connection.createSession()
      console.log('sesson', session)
      const plugin = await session.attachPlugin(Janus.StreamingPlugin.NAME)
      console.log('plugin', plugin)
      const streamList = await plugin.list()
      // const streamList = await plugin.send({ request: "list" })
      console.log('streamList', streamList)
      const data = await plugin.send({ "request": "list" })
      console.log('data', data)
      refVideo.current
      // plugin.send({}).then(function (response) { });
      // plugin.on('message', function (message) { });
      // plugin.detach();
    }
    job()
  }, [])
  return (
    <>
      <div>
        <div>
          <video id="streamVideo" ref={refVideo} width="100%" height="100%" playsInline />
        </div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
