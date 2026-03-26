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
  resources :scheduled_tasks, only: [:index]
  resources :mail_events, only: [:index]
  resources :logs, only: [:index]
  resources :deploys, only: [:index, :create]
  resources :http_requests, only: [:index]
  resources :cache, only: [:index]
  resources :incidents, only: [:index, :show, :update]

  resources :solutions, only: [:index, :show, :update] do
    member do
      post :chat
      post :push
      post :regenerate
    end
    collection do
      post :generate
    end
  end

  get  :settings, to: "settings#index"
  patch :settings, to: "settings#update"
  get :health, to: "health#index"

  # Export endpoints
  %w[errors requests queries jobs logs scheduled_tasks mail_events].each do |resource|
    get "#{resource}/export", to: "#{resource}#export", as: "#{resource}_export"
  end

  # Settings extras
  post "settings/cleanup", to: "settings#cleanup"
  post "settings/test_notification", to: "settings#test_notification"
  post "settings/run_performance_scan", to: "settings#run_performance_scan"
  patch "settings/performance_issues/:id", to: "settings#dismiss_performance_issue", as: :dismiss_performance_issue
  post "settings/run_security_scan", to: "settings#run_security_scan"
  patch "settings/security_issues/:id", to: "settings#dismiss_security_issue", as: :dismiss_security_issue
  post "settings/toggle_bullet_diagnostic", to: "settings#toggle_bullet_diagnostic"
  post "settings/stop_bullet_diagnostic", to: "settings#stop_bullet_diagnostic"

  root to: "errors#index"
end
