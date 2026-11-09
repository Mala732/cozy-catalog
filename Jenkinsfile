pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'deploylab-ci'
        COMPOSE_FILE = 'docker-compose.yml'

        POSTGRES_USER = 'deploylab_ci'
        POSTGRES_PASSWORD = 'ci-test-password'
        POSTGRES_DB = 'deploylab_ci'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    docker compose -f "$COMPOSE_FILE" config --quiet
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    docker compose -f "$COMPOSE_FILE" build
                '''
            }
        }

        stage('Start Test Environment') {
            steps {
                sh '''
                    docker compose -f "$COMPOSE_FILE" up -d
                '''
            }
        }

        stage('API Smoke Test') {
            steps {
                sh '''
                    sleep 10

                    docker compose -f "$COMPOSE_FILE" ps

                    docker compose -f "$COMPOSE_FILE" exec -T backend \
                        python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/health').read().decode())"

                    docker compose -f "$COMPOSE_FILE" exec -T backend \
                        python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/status').read().decode())"

                    docker compose -f "$COMPOSE_FILE" exec -T backend \
                        python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/info').read().decode())"
                '''
            }
        }
        stage('Terraform Init') {
            steps {
                sh '''
                    terraform -chdir=terraform init -backend=false
                '''
            }
        }

        stage('Terraform Validate') {
            steps {
                sh '''
                    terraform -chdir=terraform validate
                '''
            }
        }
    }

    post {
        always {
            sh '''
                docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true
            '''
        }

        success {
            echo 'DeployLab CI pipeline completed successfully.'
        }

        failure {
            echo 'DeployLab CI pipeline failed. Check the stage logs.'
        }
    }
}
