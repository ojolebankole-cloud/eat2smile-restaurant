import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminApp from './Admin'
import './styles.css'

const path=window.location.pathname.replace(/\/+$/,'')||'/'
const isAdmin=path==='/e2s-owner-portal-8m4q7x2n'
const route=({ '/':'home','/menu':'menu','/order':'order','/about':'about','/find-us':'find-us','/contact':'contact','/orders':'orders','/e2s-owner-portal-8m4q7x2n':'admin' } as Record<string,string>)[path]||'home'
document.body.dataset.page=route
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isAdmin?<AdminApp/>:<App/>}</React.StrictMode>
)
