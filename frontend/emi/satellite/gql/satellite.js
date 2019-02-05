import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document
export const ServiceServicesSatellite = gql`
  query ServiceServicesSatellite {
    ServiceServicesSatellite {
      _id
      businessId
      shiftId
      timestamp
      requestedFeatures 
      pickUp {
        marker {
          lat
          lng
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      dropOff {
        marker {
          lat
          lng
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      pickUpETA
      dropOffETA
      verificationCode
      paymentType
      fareDiscount
      fare
      state
      stateChanges {
        state
        timestamp
        location {
          lat
          lng
          timestamp
        }
        notes
      }
      location {
        lat
        lng
        timestamp
      }      
      vehicle {
        licensePlate
      }
      driver {
        documentId
        fullname
      }
      client {
        id
        businessId
        username
        fullname
        tip
        tipType
      }
      tip      
      route {
        lat
        lng
        timestamp
      }
      lastModificationTimestamp 
    }
  }
`;


export const ServiceClientSatellite = gql`
  query ServiceClientSatellite {
    ServiceClientSatellite {
      _id
      generalInfo {
        name
        phone
        address
        city
        neighborhood
        email
        referrerDriverDocumentId
      }
      location{
        lat
        lng
      }
    }
  }
`;


// SUBSCRIPTION
export const ServiceDriverUpdatedSubscription = gql`
  subscription{
    ServiceDriverUpdatedSubscription{
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;
