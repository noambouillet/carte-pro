import api from './AxiosConfig'

export const registerEmployee = async (firstName: string, lastName: string, email: string, password: string) => {
  try {
    const response = await api.post('/employee/register', {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
    })
    return response.data
  } catch (error) {
    console.error('Erreur lors de l\'inscription :', error)
    throw error
  }
}

export const registerPartner = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    siren: string,
    socialPurpose: string,
    establishmentName: string,
    establishmentAddress: string,
    establishmentPhone: string
) => {
  try {
    const response = await api.post('/partners/register', {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        siren,
        social_purpose: socialPurpose,
        establishment_name: establishmentName,
        establishment_address: establishmentAddress,
        establishment_phone: establishmentPhone,
    })
    return response.data
  } catch (error) {
    console.error('Erreur lors de l\'inscription :', error)
    throw error
  }
}
