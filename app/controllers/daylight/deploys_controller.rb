# frozen_string_literal: true

module Daylight
  class DeploysController < BaseController
    before_action :ensure_connected
    skip_before_action :verify_authenticity_token, only: [:create]

    def index
      @deploys = Database::DeployRecord.order(deployed_at: :desc).limit(50)
    end

    def create
      deploy = Database::DeployRecord.new(deploy_params)
      deploy.deployed_at = Time.current

      if deploy.save
        render json: {
          id: deploy.id,
          version: deploy.version,
          deployed_at: deploy.deployed_at
        }, status: :created
      else
        render json: { errors: deploy.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def deploy_params
      params.permit(:version, :description, :git_sha, :deployed_by)
    end
  end
end
