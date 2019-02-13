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
        addressLine1
        addressLine2
        city
        zone
        neighborhood
        email
        referrerDriverDocumentId
        notes
      }
      satelliteInfo{
        referrerDriverDocumentId
        tipType
        tip
        offerMinDistance
        offerMaxDistance
      }
      location{
        lat
        lng
      }
      auth {
        userKeycloakId
        username
      }
      location{
        lat
        lng
      }
      state
      businessId
    }
  }
`;

export const ServiceClientSatellites = gql`
  query ServiceClientSatellites($clientText: String, $limit: Int) {
    ServiceClientSatellites(clientText: $clientText, limit: $limit) {
      _id
      generalInfo {
        name
        phone
        addressLine1
        addressLine2
        city
        zone
        neighborhood
        email
        referrerDriverDocumentId
        notes
      }
      satelliteInfo{
        referrerDriverDocumentId
        tipType
        tip
        offerMinDistance
        offerMaxDistance
      }
      location{
        lat
        lng
      }
      auth {
        userKeycloakId
        username
      }
      location{
        lat
        lng
      }
      state
      businessId
    }
  }
`;

// MUTATIONS 
export const ServiceCoreRequestService = gql `
  mutation ServiceCoreRequestService($client: ServiceCoreClientInput!, $pickUp: ServiceCoreLocationInput!, $paymentType: String!, $requestedFeatures: [String], $dropOff: ServiceCoreLocationInput, $fareDiscount: Float, $fare: Int, $tip: Int){
    ServiceCoreRequestService(client: $client, pickUp: $pickUp, paymentType: $paymentType, requestedFeatures: $requestedFeatures, dropOff: $dropOff, fareDiscount: $fareDiscount, fare: $fare, tip: $tip){
      accepted
    }
  }
`;

export const ServiceCoreCancelService = gql `
  mutation ServiceCoreCancelService($id: String!, $reason: String!, $authorType: String!, $notes: String){
    ServiceCoreCancelService(id: $id, reason: $reason, authorType: $authorType, notes: $notes){
      accepted
    }
  }
`;

// SUBSCRIPTION
export const ServiceServiceUpdatedSubscription = gql`
  subscription{
    ServiceServiceUpdatedSubscription{
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
