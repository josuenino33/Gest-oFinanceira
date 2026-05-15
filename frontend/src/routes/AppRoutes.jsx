import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Dashboard from '../pages/Dashboard'
import Receitas from '../pages/Receitas'
import Contas from '../pages/Contas'
import Cartoes from '../pages/Cartoes'
import ComprasCartao from '../pages/ComprasCartao'
import Metas from '../pages/Metas'
import Investimentos from '../pages/Investimentos'
import Relatorios from '../pages/Relatorios'
import Categorias from '../pages/Categorias'
import Configuracoes from '../pages/Configuracoes'
import Recorrencias from '../pages/Recorrencias'
import Orcamentos from '../pages/Orcamentos'
import Envelopes from '../pages/Envelopes'
import Desafios from '../pages/Desafios'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForgotPassword from '../pages/ForgotPassword'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../components/Layout'
import Carteira from '../pages/Carteira'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path='/' element={<Dashboard />} />
          <Route path='/carteira' element={<Carteira />} />
          <Route path='/receitas' element={<Receitas />} />
          <Route path='/contas' element={<Contas />} />
          <Route path='/cartoes' element={<Cartoes />} />
          <Route path='/compras-cartao' element={<ComprasCartao />} />
          <Route path='/metas' element={<Metas />} />
          <Route path='/investimentos' element={<Investimentos />} />
          <Route path='/relatorios' element={<Relatorios />} />
          <Route path='/categorias' element={<Categorias />} />
          <Route path='/orcamentos' element={<Orcamentos />} />
          <Route path='/envelopes' element={<Envelopes />} />
          <Route path='/desafios' element={<Desafios />} />
          <Route path='/recorrencias' element={<Recorrencias />} />
          <Route path='/configuracoes' element={<Configuracoes />} />
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </BrowserRouter>
  )
}
