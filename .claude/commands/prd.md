CREATE @ai_docs/docs/photo-competition-prd.md - which is a PRD for a photo competition website.

The webiste is for the 'Wildlife Disease Association'.
The website should look modern and be responsive to be used on mobile, tablet, and desktop.

# The administrative section, should have the following feautues:
- Assign roles to users, roles are: SuperAdmin, Admin, User. Only SuperAdmins can create a new Admin
- Create competitions. Normally only one competition is active at the time
    - comptetitions have a start date, a last submission date
    - they have a title and description
    - a competition has many categories
        - the administrator can define new catetgories
        - by default, we have "Urban", "Landscape" categories
    - declare a winner (1st place), runner up (2nd place), and 3rd place for each categorie
    - define how many photos each user (defined by email address) can upload per category
    - approve, disapprove, or delete uploaded photos
    - see reported photos


# The user side:
- an authenticated user can uplaod photos to a category up to the defined number of photos
    - photos need a title, description (min 20 characters, max 500), time/date and location. These properties cannot be empty or whitespace characters
    - photos can optionaly have these properties: camera/lens, settings. 
- a user can also delete, or update one of their photos
- a user can vote for as many photos as they like, but only once per photo
- report a photo to the administrator team

# Unauthenticated users:
Can see competitions and photos but cannot vote or submit photos.



    