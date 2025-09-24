pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Sanity') {
      steps {
        sh 'ls -la'
        sh 'echo "Repo OK; next step: enable Docker access for image builds."'
      }
    }
  }
}
