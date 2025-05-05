import Janus from 'janus-gateway'

class JanusManager {
  janus = null

  constructor(inittialize = true) {
    if (inittialize) {
      this.#init()
    }
    this.#createJanusInstance()
  }

  #init() {
    Janus.init({
      debug: true,
      dependencies: Janus.useDefaultDependencies(),
      callback: () => { console.log('callback of init') },
    })
  }

  #createJanusInstance() {
    this.janus = new Janus({
      server: "http://localhost:8088/janus",
      success: () => {
        console.log('suceeded')
        this.#attachPuligin()
      },
      error: (cause) => { console.log('error', cause) },
      destroyed: () => { console.log('destroyed') },
    })
  }

  #attachPuligin() {
    this.janus.attach({
      plugin: "janus.plugin.streaming",
      success: (plugin) => {
        console.log('attachecd', plugin)
        this.#showStreaming(plugin)
      },
      onmessage: (message) => { console.log('onmessage', message) },
      onremotetrack: (data) => { console.log('on remotetrack', data) },
      oncleanup: () => Janus.log(" ::: Got a cleanup notification :::")
    })
  }

  #showStreaming(plugin) { 
    console.log('todo')
  }
}

const janusManater = new JanusManager()
console.log({ janusManater })
