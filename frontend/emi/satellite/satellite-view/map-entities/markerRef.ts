import { takeUntil } from 'rxjs/operators';

import { Subject, interval } from 'rxjs';
// <reference types="googlemaps" />

import { MapRef } from './agmMapRef';

export const MARKER_REF_ORIGINAL_INFO_WINDOW_CONTENT = `<html>
    <body>
        <div id="deviceInfoWindow">
        <h2>$$POS_DETAILS$$</h2>
        <p> <strong>$$POS_ID$$: </strong>{POS_ID}</p>
        <!-- <p> <strong>$$BUSINESS_ID$$: </strong>{BUSINESS_ID}</p> -->
        <p> <strong>$$BUSINESS_NAME$$: </strong>{BUSINESS_NAME}</p>
        <p> <strong>$$USER_NAME$$: </strong>{USER_NAME}</p>
        <p> <strong>$$LAST_UPDATE$$: </strong>{LAST_UPDATE}</p>
      </div>
    </body>
  </html>
  `;

export class Point {
  location: { coordinates: { lat: number, lng: number } };
  constructor( location: {coordinates: { lat: number, lng: number } }) {
    this.location = location;
  }
}

export class VehiclePoint {
  _id: string;
  lastUpdate: number;
  businessId: string;
  businessName: string;
  location: { type: string, coordinates: { lat: number, long: number } };
  constructor(
    _id: string,
    lastUpdate: number,
    businessId: string,
    businessName: string,
    location: { type: string, coordinates: { lat: number, long: number } }){
      this._id = _id;
      this.lastUpdate = lastUpdate;
      this.businessId =  businessId;
      this.businessName = businessName;
      this.location = location;
  }
}

export class LocationPath {
  lat: number;
  lng: number;
  timestamp: number;
}

export class MarkerRef extends google.maps.Marker {

  ngUnSubscribe = new Subject();
  updateLocation$ = new  Subject();
  clickEvent = new Subject<google.maps.MouseEvent>();
  dblclickEvent = new Subject();

  contentString = MARKER_REF_ORIGINAL_INFO_WINDOW_CONTENT;



  infoWindow = new google.maps.InfoWindow({
    content: ''
  });


  /**
   * Historical route path of the vehicle
   */
  id = null;
  routePath: google.maps.Polyline;
  //vehiclePoint: VehiclePoint = null;
  //clientPoint: ClientPoint = null;
  point: Point = null;
  lastModificationTimestamp = null;
  index = 0;
  deltaLat = 0;
  deltaLng = 0;
  lastLat = 0;
  lastLng = 0;
  numDeltas = 80;
  delay = 10;
  iconUrl;
  lastLocationPath: [LocationPath];
  allMap: MapRef;

  constructor(id, point: Point, opts?: google.maps.MarkerOptions) {
    super(opts);
    this.id = id;
    // this.setClickable(false);
    this.setLabel(' ');
    this.point = point;
    this.lastModificationTimestamp = 0;
    this.updateLocationListener();
  }

  updateInfoWindowContent(contentString){
    this.infoWindow.setContent(contentString);
  }

  updateLocationListener(){
    this.updateLocation$
    .pipe(
      takeUntil(this.ngUnSubscribe)
    )
    .subscribe((location: any) => {
      this.updateData(location.lat, location.lng, location.lastModificationTimestamp);
    })
  }

  // transition(newPosition) {
  //   this.index = 0;
  //   this.deltaLat = (newPosition[0] - this.getPosition().lat())/ this.numDeltas;
  //   this.deltaLng = (newPosition[1] - this.getPosition().lng())/ this.numDeltas;
  //   this.moveMarker1();
  // }

  // moveMarker1(){
  //   const lat = this.getPosition().lat() + this.deltaLat;
  //   const lng = this.getPosition().lng() + this.deltaLng;
  //   this.setPosition(
  //     new google.maps.LatLng(lat, lng)
  //   );

  //   if (this.index != this.numDeltas) {
  //     this.index++;
  //     setTimeout(moveMarker, delay);
  //   }
  // }

  /**
   * Updates the marker icon according to the vehicle states (Online, Alarmed, Offline)
   */

  updateIcon(iconUrl) {
    const icon = {
      url: iconUrl,
      anchor: new google.maps.Point(40, 40),
      scaledSize: new google.maps.Size(40, 40)
    };
    console.log('updateIcon => ', iconUrl);
    this.setIcon(icon);
  }

  updateData(lat: number,  lng: number, timeLocationReported: number) {

    this.setVisibility(100);
    this.index = 0;

    this.deltaLat = (lat - this.getPosition().lat()) / this.numDeltas;
    this.deltaLng = (lng - this.getPosition().lng()) / this.numDeltas;
    this.lastLat = lat;
    this.lastLng = lng;

    this.moveMarkerSmoothly(timeLocationReported, false);
  }

  /**
   *
   * @param timeLocationReported
   * @param center
   * @param initCallBack
   * @param endCallBack
   */
  moveMarkerSmoothly(
    timeLocationReported: number,
    center = false,
    initCallBack?,
    endCallBack?
  ) {
    // The marker only can be moved if the time of the new location is greater than the time of the last location reported
    if (true) {
      if (initCallBack) {
        initCallBack(this);
      }

      // this.lastModificationTimestamp = timeLocationReported;
      this.moveMarker(center, endCallBack);
    }
  }

  putMap(map: MapRef) {
    this.allMap = map;
  }

  changeRoutePathVisibility(visible: boolean) {
    this.routePath.setVisible(visible);
  }

  /**
   * Updates the location path of the marker (polyline)
   * @param locationPath
   */
  updateRoutePath(map, locationPath?: [LocationPath]) {
    if (!locationPath && locationPath.length < 1) {
      return;
    }

    if (this.routePath) {
      if (this.lastLocationPath && this.lastLocationPath.length > 0) {
        if (this.lastLocationPath[0].timestamp > locationPath[0].timestamp) {
          // It means that the location path received is older, therefore, we cannot take this new location path.
          return;
        }
      }

      this.lastLocationPath = locationPath;
      this.routePath.setMap(null);
    }

    const routePathCoordinates = [];

    for (let i = 0; i < locationPath.length; i++) {
      routePathCoordinates.push({
        lat: locationPath[i].lat,
        lng: locationPath[i].lng
      });
    }

    this.routePath = new google.maps.Polyline({
      path: routePathCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2
    });

    this.routePath.setMap(map);
  }

  moveMarker(center = false, endCallBack?) {
    const lat = this.getPosition().lat() + this.deltaLat;
    const lng = this.getPosition().lng() + this.deltaLng;
    this.setPosition(new google.maps.LatLng(lat, lng));

    if (this.allMap) {
      this.allMap.setCenter(this.getPosition());
    }

    if (this.index !== this.numDeltas) {
      this.index++;
      setTimeout(this.moveMarker.bind(this), this.delay);
    } else {
      const _lat = this.lastLat;
      const _lng = this.lastLng;
      this.setPosition(new google.maps.LatLng(_lat, _lng));
      if (this.allMap) {
        this.allMap.setCenter(this.getPosition());
      }

      if (endCallBack) {
        endCallBack(this);
      }
    }
  }

  setVisibility(visibility: number): void {
    this.setOpacity(visibility / 100);
  }

  setTitleMarker(title: string): void {
    this.setTitle(title);
  }

  sendNewLocation(location){
    this.updateLocation$.next(location);
  }

  inizialiteEvents() {
    this.addListener('click', (e: google.maps.MouseEvent) => {
      this.clickEvent.next(e);
    });
    this.addListener('dblclick', e => {
      this.dblclickEvent.next(e);
    });
    // this.addListener('dragend', (e) => { this.dragendEvent.next(e); });
    // this.addListener('position_changed', (e) => { this.position_changedEvent.next(e); });
  }

  destroy(){
    this.ngUnSubscribe.next();
    this.ngUnSubscribe.complete();
    this.updateLocation$.next();
    this.updateLocation$.complete();
    this.clickEvent.next();
    this.clickEvent.complete();
    this.dblclickEvent.next();
    this.dblclickEvent.complete();
  }
}


