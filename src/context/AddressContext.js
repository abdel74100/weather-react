import React, {Component} from 'react'
import {PropTypes} from 'prop-types'
import axios from 'axios'
import * as Sentry from '@sentry/browser'
import validName from './../utils/ValidCityName'
import fetchIPAddress from './../utils/FetchIPAddress'
import API_URL from '../utils/API'
import isValid from '../utils/ValidityChecker'
import {isUndefined} from 'lodash-es'

// const token = process.env.REACT_APP_IPINFO_TOKEN
const AddressContext = React.createContext(null)

class AddressContextProvider extends Component {
  updateState = (state) => {
    this.setState({...state})
  }

  updateFavorites = (state) => {
    this.setState({...state})
  }
  state = {
    address: {
      cityName: '',
      cityId: '',
    },
    latlong: '',
    favorites: [],
    updateState: this.updateState,
    updateFavorites: this.updateFavorites,
  }

  formatCoords = (latitude, longitude) => {
    return `${latitude},${longitude}`
  }

  updateAddress = async (latlong) => {
    let hit = {}
    try {
      const {hits} = (
        await axios.get(`${API_URL}/address/coords/${latlong}`)
      ).data
      hit = hits[0]

      if (isValid(hit)) {
        const city = hit.city ? hit.city[0] : ''
        const state = hit.administrative ? hit.administrative[0] : ''
        const country = hit.country ? hit.country : ''
        const cityName = `${validName(city)}${validName(state)}${validName(
          country,
          false
        )}`
        const cityId = hit.objectID ? hit.objectID : ''
        this.updateState({
          address: {
            cityName,
            cityId,
          },
          latlong,
        })
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  getIPAddress = async () => {
    try {
      const {lat, lon} = await fetchIPAddress()
      // update address if lat & lon are not undefined
      // isValid cannot be used on lat and lon which are of type Number
      if (!isUndefined(lat) && !isUndefined(lon)) {
        this.updateAddress(this.formatCoords(lat, lon))
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  getAddress = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latlong = this.formatCoords(
            position.coords.latitude,
            position.coords.longitude
          )
          this.updateAddress(latlong)
        },
        (error) => {
          console.error(error)
          this.getIPAddress()
        }
      )
    } else {
      this.getIPAddress()
    }
  }

  getFavorites = () => {
    if (localStorage.getItem('favorites')) {
      this.setState({
        favorites: [...JSON.parse(localStorage.getItem('favorites'))],
      })
    }
  }

  componentDidMount() {
    this.getAddress()
    // update favorites for the initial application load
    this.getFavorites()
  }

  render() {
    return (
      <AddressContext.Provider value={this.state}>
        {this.props.children}
      </AddressContext.Provider>
    )
  }
}

export {AddressContext, AddressContextProvider}

AddressContext.propTypes = {
  address: PropTypes.objectOf(PropTypes.string),
  favorites: PropTypes.array,
  updateState: PropTypes.func,
  updateFavorites: PropTypes.func,
}
