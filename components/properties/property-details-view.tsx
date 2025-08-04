import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Bed, Bath, Square, MapPin } from "lucide-react"
import type { ReactNode } from "react"

export function PropertyDetailsView({ property, actionButton, tabs, activeTab, setActiveTab, belowLocation }: {
  property: any,
  actionButton?: ReactNode,
  tabs?: ReactNode,
  activeTab?: string,
  setActiveTab?: (tab: string) => void,
  belowLocation?: ReactNode
}) {
  const formatAddress = (address: any) => {
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{property.title || formatAddress(property.address)}</h1>
          {property.title && (
            <p className="text-muted-foreground mt-1">{formatAddress(property.address)}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className="capitalize">{property.type}</Badge>
            <Badge variant={property.status === "available" ? "default" : "secondary"}>
              {property.status === "available"
                ? "Available"
                : property.status === "occupied"
                  ? "Occupied"
                  : "Maintenance"}
            </Badge>
          </div>
        </div>
        {actionButton && <div className="flex gap-2">{actionButton}</div>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="details">Details</TabsTrigger>
          {tabs}
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Property Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.images?.map((image: string, index: number) => (
                      <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Property ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                    {(!property.images || property.images.length === 0) && (
                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">No images available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{property.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{property.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{property.bathrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Square Footage</p>
                        <p className="font-medium">{property.squareFeet?.toLocaleString?.() ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {property.description && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{property.description}</p>
                    </div>
                  )}

                  {property.amenities && property.amenities.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.map((amenity: string) => (
                          <Badge key={amenity} variant="outline">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {property.petPolicy && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Pet Policy</h4>
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">Pets allowed:</span> {property.petPolicy.allowed ? "Yes" : "No"}
                        </p>
                        {property.petPolicy.allowed && (
                          <>
                            {property.petPolicy.restrictions && (
                              <p>
                                <span className="font-medium">Restrictions:</span> {property.petPolicy.restrictions}
                              </p>
                            )}
                            {property.petPolicy.petDeposit && (
                              <p>
                                <span className="font-medium">Pet deposit:</span> $
                                {property.petPolicy.petDeposit.toLocaleString()}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Rent Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Rent Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      {property.monthlyRent !== undefined ? (
                        <p className="text-3xl font-bold">${property.monthlyRent.toLocaleString()}</p>
                      ) : (
                        <p className="text-3xl font-bold text-muted-foreground">No rent info</p>
                      )}
                      <p className="text-muted-foreground">per month</p>
                    </div>
                    
                    <div className="space-y-2">
                      {property.securityDeposit && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Security Deposit:</span>
                          <span className="font-medium">${property.securityDeposit.toLocaleString()}</span>
                        </div>
                      )}
                      {property.applicationFee && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Application Fee:</span>
                          <span className="font-medium">${property.applicationFee.toLocaleString()}</span>
                        </div>
                      )}
                      {property.petPolicy?.fee && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Pet Deposit:</span>
                          <span className="font-medium">${property.petPolicy.fee.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p>{formatAddress(property.address)}</p>
                  </div>
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center mt-4">
                    <p className="text-muted-foreground">Map will appear here</p>
                  </div>
                </CardContent>
              </Card>
              {belowLocation}

              {/* Quick Actions */}
              {actionButton && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {actionButton}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 