import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import 'driver.js/dist/driver.css'

// PrimeVue imports
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

// PrimeVue components
import Button from 'primevue/button'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Tooltip from 'primevue/tooltip'
import Dialog from 'primevue/dialog'
import Sidebar from 'primevue/sidebar'
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'

const app = createApp(App)

// Configure PrimeVue
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false,
    },
  },
})

// Register PrimeVue components
app.component('PButton', Button)
app.component('Card', Card)
app.component('Panel', Panel)
app.component('Badge', Badge)
app.component('Tag', Tag)
app.component('PDialog', Dialog)
app.component('Sidebar', Sidebar)
app.component('ProgressBar', ProgressBar)
app.component('Divider', Divider)

// Register directives
app.directive('tooltip', Tooltip)

app.mount('#app')

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/flying-chess/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration)
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}
