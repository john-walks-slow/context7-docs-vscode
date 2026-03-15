# Ruby 示例
require 'rails'
require 'sinatra'
require 'json'
require 'active_record'
require 'sidekiq'
require 'graphql'

# 测试选中这些标识符来检测库
class App < Sinatra::Base
  get '/hello' do
    'Hello World'
  end
end

# Rails
class User < ActiveRecord::Base
  has_many :posts
end

# Sidekiq
class HardWorker
  include Sidekiq::Worker
  
  def perform(name, count)
    # do work
  end
end

# GraphQL
class QueryType < GraphQL::Schema::Object
  field :user, UserType, null: false do
    argument :id, ID, required: true
  end
end