import { useState } from 'react'
import { supabase } from './lib/supabase'
import './App.scss'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  const [count, setCount] = useState(0)


  return (
    <>
      {/* AuthProvider - propsではなく、間に挟まったchildrenをコンポーネントに渡す */}
      <AuthProvider> 
        <div className="title">Any ideas?</div>
        <p>testテスト</p>
        <p>test2テスト２</p>
      </AuthProvider>
    </>
  )
}

export default App