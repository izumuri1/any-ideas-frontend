import { useState } from 'react'
import { supabase } from './lib/supabase'
import './App.scss'

function App() {
  const [count, setCount] = useState(0)


  return (
    <>
      <div className="title">Any ideas?</div>
      <p>testテスト</p>
    </>
  )
}

export default App