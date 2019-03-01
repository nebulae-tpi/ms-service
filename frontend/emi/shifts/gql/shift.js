import gql from "graphql-tag";


export const ServiceShiftClose = gql `
  mutation ServiceShiftClose($id: String!){
    ServiceShiftClose(id: $id){
      code
      message
    }
  }
`;

// We use the gql tag to parse our query string into a query document
export const ServiceShift = gql`
  query ServiceShift($id: String!) {
    ServiceShift(id: $id) {
      _id
      businessId
      timestamp
      state
      online
      lastReceivedComm
      location {
        type
        coordinates
      }
      driver {
        id
        fullname
        blocks{
          key
        }
        documentType
        documentId
        pmr
        languages
        phone
        username
      }
      vehicle {
        id
        licensePlate
        blocks {
          key
        }
        features
        brand
        line
        model
      }
    }
  }
`;


export const ServiceShifts = gql`
  query ServiceShifts($filterInput: ServiceShiftFilterInput!, $paginationInput: ServiceShiftPaginationInput!) {
    ServiceShifts(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      businessId
      timestamp
      state
      online
      lastReceivedComm
      # location {
      #   type
      #   coordinates
      # }
      driver {
        id
        fullname
        blocks {
          key
        }
        # documentType
        documentId
        # pmr
        # languages
        # phone
        username
      }
      vehicle {
        id
        licensePlate
        # blocks
        # features
        # brand
        # line
        model
      }
    }
  }
`;

export const ServiceShiftsSize = gql`
  query ServiceShiftsSize($filterInput: ServiceShiftFilterInput!) {
    ServiceShiftsSize(filterInput: $filterInput)
  }
`;


export const ServiceShiftStateChangesList = gql`
  query ServiceShiftStateChangesList( $id: String!, $paginationInput: ServiceShiftPaginationInput!) {
    ServiceShiftStateChangesList(id: $id, paginationInput: $paginationInput) {
      state
      timestamp
    }
  }
`;

export const ServiceShiftStateChangesListSize = gql`
  query ServiceShiftStateChangesListSize($id: String!) {
    ServiceShiftStateChangesListSize(id: $id)
  }
`;

export const ServiceShiftOnlineChangesList = gql`
  query ServiceShiftOnlineChangesList( $id:String! $paginationInput: ServiceShiftPaginationInput!) {
    ServiceShiftOnlineChangesList(id: $id, paginationInput: $paginationInput) {
      online
      timestamp
    }
  }
`;

export const ServiceShiftOnlineChangesListSize = gql`
  query ServiceShiftOnlineChangesListSize($id: String!) {
    ServiceShiftOnlineChangesListSize(id: $id)
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
