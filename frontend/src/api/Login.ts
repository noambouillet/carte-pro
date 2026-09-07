import api from './Axios'

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/employee/login', { email, password })
    return response.data
  } catch (error) {
    console.error('Erreur lors de la connexion :', error)
    throw error
  }
}
