// JavaScript/TypeScript 示例
import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import _ from 'lodash'
import moment from 'moment'
import * as yup from 'yup'
import { z } from 'zod'

// 测试选中这些标识符来检测库
// useState -> 应该识别为 react
// useEffect -> 应该识别为 react
// axios.get() -> 应该识别为 axios
// _.debounce() -> 应该识别为 lodash
// moment() -> 应该识别为 moment
// z.object() -> 应该识别为 zod

const App = () => {
  const [state, setState] = useState(null)

  useEffect(() => {
    axios.get('/api/data').then((res) => setState(res.data))
  }, [])

  // zod 测试 - 选中 z 或 object 或 z.object
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  })

  return <div>{JSON.stringify(state)}</div>
}

// CommonJS 风格
const express = require('express')
const app = express()

// lodash 函数 - 选中 _ 或 debounce 或 _.debounce
const debounced = _.debounce(() => {}, 300)

// moment - 选中 moment
const formatted = moment().format('YYYY-MM-DD')

// yup - 选中 yup
const schema2 = yup.object().shape({
  name: yup.string().required(),
})
