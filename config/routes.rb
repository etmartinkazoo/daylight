# frozen_string_literal: true

Daylight::Engine.routes.draw do
  resources :errors, only: [:index, :show, :update, :destroy] do
    collection do
      post :batch
    end
  end

  resources :requests, only: [:index]
  resources :queries, only: [:index]
  resources :jobs, only: [:index]
  resources :logs, only: [:index]
  resources :deploys, only: [:index, :create]
  resources :http_requests, only: [:index]
  resources :cache, only: [:index]

  get  :settings, to: "settings#index"
  patch :settings, to: "settings#update"
  get :health, to: "health#index"

  # Export endpoints
  %w[errors requests queries jobs logs].each do |resource|
    get "#{resource}/export", to: "#{resource}#export", as: "#{resource}_export"
  end

  # Settings extras
  post "settings/cleanup", to: "settings#cleanup"
  post "settings/test_notification", to: "settings#test_notification"

  root to: "errors#index"
end
