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
  get  :settings, to: "settings#index"
  patch :settings, to: "settings#update"

  root to: "errors#index"
end
