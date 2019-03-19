import gql from "graphql-tag";

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
        clientAgreements{
          clientId
          clientName
          documentId
          tip
          tipType
        }
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