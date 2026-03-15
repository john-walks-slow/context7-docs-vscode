# Python 示例
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
import requests
from pydantic import BaseModel
import sqlalchemy as sa
from typing import Optional, List
from sklearn.model_selection import train_test_split
from collections import defaultdict

# 测试选中这些标识符来检测库
# np.array() -> 选中 np 或 array 或 np.array 都应该识别为 numpy
# pd.DataFrame() -> 应该识别为 pandas
# FastAPI() -> 应该识别为 fastapi
# BaseModel -> 应该识别为 pydantic

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float

# 测试别名
df = pd.DataFrame({'a': [1, 2, 3]})
arr = np.array([1, 2, 3])

response = requests.get('https://api.example.com')
engine = sa.create_engine('sqlite:///:memory:')

# sklearn 测试
X_train, X_test = train_test_split([1, 2, 3, 4])