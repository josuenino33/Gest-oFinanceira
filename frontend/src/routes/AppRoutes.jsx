import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Dashboard from '../pages/Dashboard'
import Resumo from '../pages/Resumo'
import Receitas from '../pages/Receitas'
import Contas from '../pages/Contas'
import Cartoes from '../pages/Cartoes'
import ComprasCartao from '../pages/ComprasCartao'
import Metas from '../pages/Metas'
import Investimentos from '../pages/Investimentos'
import Relatorios from '../pages/Relatorios'
import Categorias from '../pages/Categorias'
import Planejamento from '../pages/Planejamento'
import Configuracoes from '../pages/Configuracoes'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ProtectedRoute from '../components/ProtectedRoute'

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/' element={<Protected><Dashboard /></Protected>} />
        <Route path='/resumo' element={<Protected><Resumo /></Protected>} />
        <Route path='/receitas' element={<Protected><Receitas /></Protected>} />
        <Route path='/contas' element={<Protected><Contas /></Protected>} />
        <Route path='/cartoes' element={<Protected><Cartoes /></Protected>} />
        <Route path='/compras-cartao' element={<Protected><ComprasCartao /></Protected>} />
        <Route path='/metas' element={<Protected><Metas /></Protected>} />
        <Route path='/investimentos' element={<Protected><Investimentos /></Protected>} />
        <Route path='/relatorios' element={<Protected><Relatorios /></Protected>} />
        <Route path='/categorias' element={<Protected><Categorias /></Protected>} />
        <Route path='/planejamento' element={<Protected><Planejamento /></Protected>} />
        <Route path='/configuracoes' element={<Protected><Configuracoes /></Protected>} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </BrowserRouter>
  )
}
