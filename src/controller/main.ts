import { createApp } from 'vue'
import ControllerApp from './App.vue'
import '../assets/main.css'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'

const app = createApp(ControllerApp)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark-mode',
      cssLayer: false,
    },
  },
})

app.component('PButton', Button)
app.component('ProgressBar', ProgressBar)
app.component('Badge', Badge)
app.component('Tag', Tag)

app.mount('#app')
